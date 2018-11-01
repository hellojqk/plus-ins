var data = [];
var host = "http://api.godsnb.com";

//全局的ajax访问，处理ajax清求时session超时
$.ajaxSetup({
  contentType: "application/x-www-form-urlencoded;charset=utf-8",
  complete: function (XMLHttpRequest, textStatus) {
    if (XMLHttpRequest.status !== 200) {
      notice(XMLHttpRequest.responseText);
    }
  }
});

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  //console.log('收到来自content-script的消息：');
  //console.log(request, sender, sendResponse);
  try {
    switch (request.req_type) {
      case "save_detail":
        save_detail(request);
        break;
      case "save_goods_list":
        save_goods_list(request);
        break;
      case "pim_cat_list":
        save_pim_cat_list(request);
        break;
      case "pim_brand_list":
        save_pim_brand_list(request);
        break;
      case "notice":
        chrome.notifications.create(null, request.data);
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

function save_pim_brand_list(request) {
  $.post(host + "/pim/brand/list", {
    data: request.data
  }, function (result) {
    if (result && result.message && result.status) {
      notice(result);
    } else {
      notice("异常" + result);
    }
  });
}
function save_pim_cat_list(request) {
  $.post(host + "/pim/cat/list", {
    data: request.data
  }, function (result) {
    if (result && result.message && result.status) {
      notice(result);
    } else {
      notice("异常" + result);
    }
  });
}

function save_goods_list(request) {
  $.post(host + "/api/goods/list/", {
    data: request.data
  }, function (result) {
    if (result && result.message && result.status) {
      notice(result);
    } else {
      notice("异常" + result);
    }
    //如果有下个链接
    if (request.next_url) {
      //判断是否需要自动下一页
      chrome.storage.local.get(["get_list_next"], function (info) {
        if (info["get_list_next"] === true) {
          setTimeout(function () {
            openUrlCurrentTab(request.next_url);
          }, 3000);
        }
      });
    }
  });
}

function save_detail(request) {
  var dataJson = JSON.parse(request.data);
  $.post(
    host + "/api/goods/", {
      data: request.data,
      data_id: dataJson["data_id"]
    },
    function (result) {
      if (result && result.message && result.status) {
        notice(result.message + "----" + dataJson["title"]);
      } else {
        notice("异常" + result);
        // sendMessageToContentScript({
        //   req_type: "api_result",
        //   status: 500,
        //   message: "异常" + result
        // });
      }
    }
  );
}

function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
      if (callback) callback(response);
    });
  });
}

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name == "task_get") {
    port.onMessage.addListener(function (msg) {
      data.push(msg);
      port.postMessage({
        answer: "添加成功"
      });
    });
  } else if (port.name == "task_get") {
    port.onMessage.addListener(function (msg) {
      data = msg.data;
      port.postMessage(JSON.stringify(data));
    });
  }
});

var showImage = true;
// 监听登录接口
chrome.webRequest.onCompleted.addListener(
  details => {
    for (var i = 0; i < details.responseHeaders.length; ++i) {
      if (details.responseHeaders[i].name === "Authorization") {
        chrome.storage.local.set({
            gods_auth: details.responseHeaders[i].value
          },
          function () {
            console.log("save auth info into storage success");
          }
        );
        break;
      }
    }
  }, {
    urls: ["*://api.godsnb.com/login*"]
  },
  ["responseHeaders"]
);


//https://open.taobao.com/handler/document/getApiCatelogConfig.json?scopeId=&treeId=&docId=4&docType=2&_tb_token_=55866d1e55e7e
//监听类目列表接口
chrome.webRequest.onCompleted.addListener(
  details => {

  }, {
    urls: ["*://open.taobao.com/handler/document/getApiCatelogConfig.json*"]
  },
  ["responseHeaders"]
);

var AuthInfo = "";
setInterval(function () {
  chrome.storage.local.get({
    gods_auth: ""
  }, function (info) {
    AuthInfo = info.gods_auth;
    //console.log(AuthInfo);
  });
}, 2000);
// 监听发送商品数据接口
chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    details.requestHeaders.push({
      name: "Authorization",
      value: AuthInfo
    });
    console.log(details.requestHeaders);
    return {
      requestHeaders: details.requestHeaders
    };
  }, {
    urls: ["*://api.godsnb.com/*"]
  },
  ["blocking", "requestHeaders"]
);

function notice(data) {
  chrome.notifications.create(null, {
    type: "basic",
    iconUrl: "img/icon.png",
    title: "数据采集提示",
    message: data["message"] || data
  });
}

// 获取当前选项卡ID
function getCurrentTabId(callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    if (callback) callback(tabs.length ? tabs[0].id : null);
  });
}

// 当前标签打开某个链接
function openUrlCurrentTab(url) {
  getCurrentTabId(tabId => {
    console.log(tabId);
    chrome.tabs.update(tabId, {
      url: url
    });
  });
}