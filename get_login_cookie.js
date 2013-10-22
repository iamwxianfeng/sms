var Sinalogin = require('sinalogin');
var request = require('request');
var config = require("./config/config");

var account = {
  name: config.weiboEmail,
  passwd: config.weiboPassword,
  cookiefile: config.weiboEmail + ".dat"
}

Sinalogin.weibo_login(account, function(err, loginInfo){
  if(loginInfo.logined){
    var j = loginInfo.j;

    request({ url: 'http://api.weibo.com/2/users/domain_show.json?domain=agentzh&source=211160679', jar: j }, function(err, response, body){
      console.log(body);
    });
  }
});

