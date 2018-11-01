chrome.storage.local.get({ gods_auth: "" }, function(info) {
  if (!info.gods_auth) {
    return;
  }
  var auth_info = info.gods_auth.split(".");
  if (auth_info.length != 3) {
    return;
  }
  var user_info = JSON.parse(window.atob(auth_info[1]));
  var now_date = Math.round(new Date() / 1000);
  console.log(user_info.exp < now_date);
  if (user_info.exp < now_date) {
    return;
  }
  $(".login").show();
  $("#user_name").html(user_info.name);
  $(".notlogin").hide();
});
$("#btn_login").on("click", function() {
  chrome.tabs.create({ url: "http://godsnb.com/#/passport/login" });
});

$("#setting_list input[type='checkbox']").each(function(i, item) {
  var key = $(item).attr("id");
  chrome.storage.local.get([key], function(info) {
    $("#" + key).prop("checked", info[key]);
  });
});

$("#setting_list input[type='checkbox']").on("click", function() {
  var key = $(this).attr("id");
  var value = $(this).is(":checked");
  var jObj = {};
  jObj[key] = value;
  chrome.storage.local.set(jObj, function(info) {});
});
