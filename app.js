
/**
 * Module dependencies.
 */

 var express = require('express');
 var routes = require('./routes');
 var user = require('./routes/user');
 var http = require('http');
 var path = require('path');

 var request = require('request');
 var mysql = require('mysql');
 var urlencode = require('urlencode');
 var sina = require('sinalogin');
 var _ = require("underscore");
 var fs = require('fs');
 var Cookie = require('cookie-jar');
 var config = require('./config/config');

 var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var dbContent = fs.readFileSync(__dirname + "/database.json", "utf8");
var databaseCfg = JSON.parse(dbContent);
var dev = databaseCfg.development;

var connection = mysql.createConnection({
  host     : dev.host,
  user     : dev.user,
  password : dev.password,
  database: dev.database
});

connection.connect();

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var userApi = function(style, weibo){
  var userUri;
  if (style == 'domain'){
    userUri = 'http://api.weibo.com/2/users/domain_show.json?source=5786724301&domain=' + weibo;
  }else{
    userUri = "http://api.weibo.com/2/users/show.json?source=211160679&uid=" + weibo;
  }
  return userUri;
}

var address = function(style, weibo){
  var addr;
  if (style == 'domain'){
    addr = "http://weibo.com/" + weibo;
  }else{
    addr = "http://weibo.com/u/" + weibo;
  }
  return addr;
}

// check weibo
app.post("/check_weibo", function(req, res){
  var weibo = req.param('weibo');
  var style = req.param('style');

  var data = fs.readFileSync("./cookie.txt", 'utf-8');
  var cookies = data.split('\n');

  var j = request.jar();

  cookies.forEach(function(cookie){
    j.add(new Cookie(cookie));
  });

  var addr = address(style, weibo);
  var userUri = userApi(style, weibo);

  connection.query("select * from users where status = 1 AND weibo = " + connection.escape(addr), function(err, result){
    if (!err && result.length > 0){
      res.send({ code: 0, error: "this weibo has exist" });
      return;
    }else{

      request({ url: userUri, jar: j }, function(err, response, body){
        if (!err){
          var ret = JSON.parse(body);
          if (ret.error){
            res.send({ code: 0, error: "Error!,make sure your weibo domain id is correct"});
          }else{
            var uid = ret.idstr;
        var createdAt = ret.created_at; // user signup date
        if ( createdAt < "2013-09-01" ){
          res.send({ code: 0, error: 'weibo signup date must > 2013-09-01' });
          return;
        }
        var followersCount = ret.followers_count; // user followers count
        if (followersCount <= 50){
          res.send({ code: 0, error: 'weibo followers count must > 50' });
          return;
        }
        var feedUri = "http://api.weibo.com/2/statuses/user_timeline.json?count=10&source=211160679&uid=" + uid;
        request({ url: feedUri, jar: j }, function(err, response, body){
          if (!err){
            // console.log(body);
            var ret = JSON.parse(body);
            var statuses = ret.statuses;
            var rt_feeds = [];
            for ( var i = 0; i < statuses.length; i++ ){
              if (statuses[i].retweeted_status){
                rt_feeds.push(statuses[i]);
              }
            }
            var rt_ids = []; // user repost feed ids
            for (var i = 0; i < rt_feeds.length; i++){
              rt_ids.push(rt_feeds[i].retweeted_status.id);
            }
            var id = config.feedId;
            if (_.indexOf(rt_ids,id) == -1){
              res.send({ code: 0, error: 'your are not repost our feed' });
              return;
            }
            connection.query("select * from users where weibo = " + connection.escape(addr), function(err, result){
              if (!err && result.length == 0)
                connection.query("insert into users set ?", { weibo: addr });
            });
            res.send({ code: 1 });
          }
        });
      }
    }
  });

}
});

});

// send sms to user mobile
app.post("/send_sms", function(req, res){
  var weibo = req.param("weibo");
  if (weibo == ""){
    res.send({ code: 0, error: 'must check weibo first' });
    return;
  }
  var style = req.param("style");
  var mobile = req.param('mobile');
  var addr = address(style, weibo);
  connection.query("SELECT * FROM users WHERE mobile = ?", [mobile], function(err, result){
    if (result && result.length > 0){
      res.send({ code: 0, error: 'this mobile have exist' });
      return;
    }else{
      // var ip = req.ip;
      var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      connection.query("SELECT * FROM users WHERE ip = ?", [ip], function(err, result){
        if (result && result.length > 0){
          res.send({ code: 0, error: 'this ip have exist' });
          return;
        }else{

          var code = Math.round(900000*Math.random()+100000);
          connection.query("update users set mobile = ?, sms_code = ?, ip = ?, created_at = ? where weibo = ?",[mobile, code, ip, new Date(), addr],function(err, result){
            if (!err){
              var content = urlencode("验证码: " + code, "gb2312");
              var uri = config.smsServer + "?CorpID="+ config.corpId +"&Pwd="+ config.pwd +"&Mobile="+ mobile +"&Content="+ content +"&Cell=&SendTime=";
              // console.log(uri);
              request(uri, function(error, response, body){
                if (!error && response.statusCode == 200 && body > 0) {
                  connection.query("UPDATE users set sms_status = 1 WHERE mobile = " + connection.escape(mobile));
                  res.send({ code: 1 });
                }else{
                  res.send({ code: 0, error: 'send sms ERROR' });
                }
              });
            }
          });

        }
      });
}
});

});

// verify sms code to match mobile number
app.post("/verify",function(req, res){
  var mobile = req.param('mobile');
  var code = req.param('code');
  var sql = "SELECT * FROM users WHERE status = 0 AND mobile = "+ connection.escape(mobile) +" AND sms_code = " + connection.escape(code);
  connection.query(sql, function(err, result){
    if (result && result.length == 1){
      connection.query("UPDATE users SET status = 1 WHERE mobile = " + connection.escape(mobile));
      res.send({ code: 1 })
    }else{
      connection.query("SELECT * FROM users WHERE mobile = ? AND status = 1", [mobile], function(err, result){
        if (result && result.length == 1)
          res.send({ code: 0, error: 'you have verified' });
        else
          res.send({ code: 0, error: 'verify Fail,your code is correct?' });    
      });
    }
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
