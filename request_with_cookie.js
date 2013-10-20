var request = require("request");
var fs = require("fs");
var Cookie = require('cookie-jar');

var data = fs.readFileSync("./cookie.txt", 'utf-8');
var cookies = data.split('\n');

var j = request.jar();

cookies.forEach(function(cookie){
  j.add(new Cookie(cookie));
});

// console.log(j);

var uri = "http://api.weibo.com/2/users/domain_show.json?domain=wxianfeng&source=211160679";
request({url: uri, jar: j}, function (err, response, body) {
  console.log(body);
});
