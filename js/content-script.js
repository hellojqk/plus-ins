console.log("加载商品采集插件");
var delay = 1; //in milliseconds
var scroll_amount = 1; // in pixels
//当前页面高度
var scrollHeight = $("body").outerHeight();
//获取windows高度
var windowHeight = $(this).height();
//已经滚动了的高度
var scrollTop = $(document).scrollTop();

setTimeout(collection, 1000);

var collect_item = function (url, callback) {
  var obj = {};
  obj.url = url;
  obj.callback = callback;
  return obj;
};
var collect_list = [];

collect_list.push(
  collect_item("www.grainger.cn/categoryindex", function () {
    collectionPIMCat();
  })
);
collect_list.push(
  collect_item("www.grainger.cn/brandindex", function () {
    collectionPIMBrand();
  })
);

collect_list.push(
  collect_item("detail.tmall.com/item.htm", function () {
    //详情页
    chrome.storage.local.get(["get_detail"], function (info) {
      if (info["get_detail"] === true) {
        PageScroll(collectionTbGoodsDetail);
      }
    });
  })
);

collect_list.push(
  collect_item("list.tmall.com/search_product.htm", function () {
    //从 storage中获取是否设置了识别列表页
    chrome.storage.local.get(["get_list"], function (info) {
      if (info["get_list"] === true) {
        collectionTMList();
      }
    });
  })
);
collect_list.push(
  collect_item("open.taobao.com/api.htm", function () {
    //是否采集淘宝开放平台接口列表
    chrome.storage.local.get(["get_open_tb"], function (info) {
      if (info["get_open_tb"] === true) {
        collection_open_tb();
      }
    });
  })
);

function collection() {
  // chrome.storage.local.get('_token', function(items) {
  //     console.log(JSON.stringify(items));
  // });
  $(collect_list).each(function (i, item) {
    if (location.href.indexOf(item.url) > -1) {
      item.callback();
    }
  });
}

function collectionPIMBrand() {
  var brand_list = []
  $(".brandUL>ul li").each(function (i, item) {
    var name_tag = $(item).data("index")
    $(item).find("dd").each(function (i, item2) {
      var logo = $(item2).find("img").data("original")
      var name = $(item2).find("h3 a").text();
      var name_zh = $(item2).find("h3 a").text();
      var doubleNames = $(item2).find("h3 div")
      if (doubleNames && doubleNames.length > 1) {
        name_zh = $(doubleNames[0]).text()
        name = $(doubleNames[1]).text()
      }
      var custom_id = parseInt($(item2).find("h3 a").attr("href").match(/b-(\d*)/)[1]);

      brand_list.push({
        custom_id: custom_id,
        name: $.trim(name),
        name_zh: $.trim(name_zh),
        name_tag: name_tag,
        logo: logo
      })
    });
  });
  SendToWeb("pim_brand_list", brand_list)
};

function collectionPIMCat() {
  var cat_list = []
  $(".hashDiv .hashDivCon").each(function (i, item) {
    var name = $(item).data("index")
    var custom_id = parseInt($(item).find(".hashDivTit a").attr("href").match(/c-(\d*)/)[1]);
    cat_list.push({
      name: name,
      custom_id: custom_id,
      custom_parent_id: 0
    })
    $(item).find(".hashUL .clearfix").each(function (i2, item2) {
      var name2 = $(item2).find(".li_l a").html();
      var custom_id2 = parseInt($(item2).find(".li_l a").attr("href").match(/c-(\d*)/)[1]);
      cat_list.push({
        name: name2,
        custom_id: custom_id2,
        custom_parent_id: custom_id
      })
      $(item2).find(".li_r dd").each(function (i3, item3) {
        var name3 = $(item3).find("a").html();
        var custom_id3 = parseInt($(item3).find("a").attr("href").match(/c-(\d*)/)[1]);
        cat_list.push({
          name: name3,
          custom_id: custom_id3,
          custom_parent_id: custom_id2
        })
      });
    });
  });
  SendToWeb("pim_cat_list", cat_list)
}
//collectionTMList 搜索结果列表页自动保存列表信息到数据库中
function collectionTMList() {
  var goodsSummaryList = [];
  $("#J_ItemList .product").each(function (i, item) {
    if ($(this).hasClass("album-new2")) {
      return true;
    }
    var title = $.trim(
      $(this)
      .find(".productTitle")
      .text()
    );
    var image = $(this)
      .find(".productImg-wrap img")
      .attr("src");
    var price =
      $(this)
      .find(".productPrice em")
      .attr("title") * 100;
    if (!title) {
      title = $(this)
        .find(".palr-title")
        .text();
    }
    if (!image || image.indexOf("data:") == 0) {
      image = $(this)
        .find("img[data-ks-lazyload]")
        .attr("data-ks-lazyload");
    }
    if (image.indexOf("//") == 0) {
      image = image.substring(2);
    }
    var data_id = $(this).data("id");
    if (!title || !image || !price || image.indexOf("data:") == 0) {
      debugger;
      return false;
    } else {
      goodsSummaryList.push({
        title: title,
        image: image,
        price: price,
        data_id: data_id,
        collection_type: 102
      });
    }
  });
  var next_url = $("#content .ui-page-next")[0].href;
  console.log(next_url);
  SendToWeb("save_goods_list", goodsSummaryList, next_url);
}

function SendToWeb(req_type, data, next_url) {
  console.log(JSON.stringify(data));
  chrome.runtime.sendMessage({
      req_type: req_type,
      data: JSON.stringify(data),
      next_url: next_url
    },
    function (response) {}
  );
}

function collectionTbGoodsDetail(callback) {
  var goodsObj = {};
  goodsObj["collection_type"] = 102;
  goodsObj["data_id"] = location.search.match(/id=(\d*)/)[1];
  goodsObj["title"] = $.trim($("#J_DetailMeta .tb-detail-hd h1").text());
  goodsObj["subtitle"] = $.trim($("#J_DetailMeta .tb-detail-hd .newp").text());
  goodsObj["desc"] = $.trim($("#description .content").html());
  goodsObj["market_price"] =
    $.trim($("#J_StrPriceModBox .tm-price").text()) * 100;
  goodsObj["price"] = $.trim($("#J_PromoPrice .tm-price").text()) * 100;
  goodsObj["attr"] = {};
  $("#J_AttrUL li").each(function (i, item) {
    var attrStr = $.trim($(item).text());
    var attrAry = attrStr.split(":");
    var attrName = $.trim(attrAry[0]);
    var attrValues = $.trim(attrAry[1]);
    goodsObj["attr"][attrName] = attrValues.split(/[\s\n]/);
  });
  goodsObj["images"] = [];
  $("#J_UlThumb img").each(function (i, item) {
    var image = $(item).attr("src");
    image = "http:" + image.replace("_60x60q90.jpg", "");
    goodsObj["images"].push(image);
  });
  var shopConfig = {};
  $("script").each(function (i, item) {
    var scriptStr = $.trim($(item).text());
    if (scriptStr.indexOf("TShop.Setup(") > 0) {
      scriptStr = scriptStr.match(/TShop.Setup\(([\S\s]*)/)[1];
      scriptStr = scriptStr.replace(/(\);\s}\)\(\);)/, "");
      shopConfig = JSON.parse(scriptStr);
    }
  });
  // var saleNames = []
  // $("#J_DetailMeta .tb-sku .tm-sale-prop").each(function (i, item) {
  //     var saleName = $(item).find(".tb-metatit").text();
  //     saleNames.push(saleName);
  // });

  var specAry = [];
  $("#J_DetailMeta .tb-sku .tm-sale-prop").each(function (i, item) {
    var saleName = $(item)
      .find(".tb-metatit")
      .text();
    var specs = [];
    $(item)
      .find(".J_TSaleProp li")
      .each(function (j, prop) {
        var text = $.trim($(prop).text());
        var kvIds = $(prop).data("value");
        var image = $(prop)
          .find("a")
          .attr("style");
        var spec = {};
        spec["kvIds"] = kvIds;
        spec[saleName] = {};
        spec[saleName]["Text"] = $.trim(text.replace("已选中", ""));
        spec[saleName]["kvIds"] = kvIds;
        if (image) {
          image = "http://" + image.match(/\/\/(\S*)_40x40q90.jpg/)[1];
          if (image.indexOf(".jpg") != image.length - 4) {
            image = image + ".jpg";
          }
          spec[saleName]["image"] = image;
        }
        specs.push(spec);
      });
    specAry.push(specs);
  });
  var skus = [];
  for (var i = 0; i < specAry.length; i++) {
    skus = mergeSpec(skus, specAry[i]);
  }
  for (var i = 0; i < skus.length; i++) {
    var configSku =
      shopConfig["valItemInfo"]["skuMap"][";" + skus[i]["kvIds"] + ";"];
    if (configSku) {
      skus[i]["price"] = configSku["price"] * 100;
      skus[i]["stock"] = configSku["stock"];
    }
  }

  goodsObj["skus"] = skus;
  if (goodsObj["desc"] == "" || goodsObj["desc"] == "描述加载中") {
    // $.get("https://" + shopConfig["api"]["descUrl"], {}, function (data) {
    //     if (data && data.indexOf("var") == 0) {
    //         goodsObj["Desc"] = data.substring(9, data.length - 12);
    //     } else {
    tip("页面解析结果：信息缺失！！");
    //     }
    // });
    console.log(goodsObj);
    return;
  }
  SendToWeb("save_detail", goodsObj);
}

function mergeSpec(beforeResult, ary) {
  if (beforeResult.length == 0) {
    return ary;
  }
  var newAry = [];
  $(beforeResult).each(function (i, item) {
    $(ary).each(function (j, item2) {
      var beforeItem = {};
      $.extend(true, beforeItem, item);
      newAry.push(beforeItem);
      var keys = Object.keys(item2);
      $(keys).each(function (k, key) {
        if (key !== "kvIds") {
          newAry[newAry.length - 1][key] = item2[key];
        } else {
          newAry[newAry.length - 1][key] =
            newAry[newAry.length - 1][key] + ";" + item2[key];
        }
      });
    });
  });
  return newAry;
}

function PageScroll(callback) {
  var scrollerEvent = setInterval(() => {
    //当前的页面高度
    scrollHeight = $("body").outerHeight();
    var nowDescLength = $("#description .content").html().length;
    //console.log("scrollHeight:" + scrollHeight + "======scrollTop:" + scrollTop);
    //说明没有滚动到下边
    var contentObj = $("#description .content");
    //console.log("scrollHeight:" + scrollHeight + "======scrollTop:" + scrollTop + "======windowHeight:" + windowHeight);
    if (
      (scrollHeight > scrollTop + windowHeight + 100 &&
        scrollTop < 2000 &&
        nowDescLength < 100) ||
      !contentObj ||
      $.trim(contentObj.html()).length < 6
    ) {
      //叠加滚动高度
      scrollTop += scroll_amount;
      $(document).scrollTop(scrollTop);
      //console.log($("#description .content").html().length);
    } else {
      console.log($("#description .content").html());
      //console.log("详情滚动完成。。。。");
      setTimeout(() => {
        if (callback) {
          callback();
        }
      }, 1000);
      clearInterval(scrollerEvent);
    }
  }, delay);
}

function collection_open_tb() {
  console.log("开始识别当前页面数据");
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("监听后台请求信息：" + JSON.stringify(request));
  try {
    switch (request.req_type) {
      //接受后台调用WEB API处理完成后的转发通知
      case "api_result":
        //tip(request);
        break;
      default:
        sendResponse({
          status: false,
          message: "未能识别的操作"
        });
        break;
    }
  } catch (e) {
    sendResponse({
      status: false,
      message: "请求异常！" + e
    });
  }
});

function sendMessageToBackground(message) {
  chrome.runtime.sendMessage({
      greeting: message || "你好，我是content-script呀，我主动发消息给后台！"
    },
    function (response) {
      tip("后台处理结果：" + response);
    }
  );
}

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener("DOMContentLoaded", function () {
  // 注入自定义JS
  injectCustomJs();
});

// 向页面注入JS
function injectCustomJs(jsPath) {
  jsPath = jsPath || "js/inject.js";
  var temp = document.createElement("script");
  temp.setAttribute("type", "text/javascript");
  // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.src = chrome.extension.getURL(jsPath);
  temp.onload = function () {
    // 放在页面不好看，执行完后移除掉
    this.parentNode.removeChild(this);
  };
  document.body.appendChild(temp);
}

var tipCount = 0;
// 简单的消息通知
function tip(info) {
  info = info || "";
  // var ele = document.createElement("div");
  // ele.className = "chrome-plugin-simple-tip slideInLeft";
  // ele.style.top = tipCount * 70 + 20 + "px";
  // ele.innerHTML = `<div>${info}</div>`;
  // document.body.appendChild(ele);
  // ele.classList.add("animated");
  // tipCount++;
  // setTimeout(() => {
  //   ele.style.top = "-100px";
  //   setTimeout(() => {
  //     ele.remove();
  //     tipCount--;
  //   }, 400);
  // }, 3000);

  chrome.runtime.sendMessage({
    req_type: "Notice",
    Data: {
      type: "basic",
      iconUrl: "img/icon.png",
      title: "数据采集提示",
      message: info.message || info
    }
  });
}