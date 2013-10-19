
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
 var fs = require('fs');
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

// app.get('/', routes.index);
app.get('/users', user.list);

app.get('/send_sms', function(req, res){
 var content = urlencode('你好', 'gb2312');
 console.log(content);
 var uri = 'http://admin.esoftsms.com/sdk/BatchSend2.aspx?CorpID=test01033&Pwd=123456&Mobile=15001108691&Content='+ content +'&Cell=&SendTime=';
 console.log(uri);
 request(uri, function (error, response, body) {
    // console.log(response);
    console.log(body < 0); // -3
    // console.log(error);
    if (!error && response.statusCode == 200) {
      res.send({ code: 1 });
    }
  })
});


app.post("/send_sms", function(req, res){
  var mobile = req.param('mobile');
  connection.query("select * from users where mobile = ?", [mobile] ,function(err, result){
    if (result && result.length > 0){
      res.send({ code: 0, error: 'cant submit twice' });
    }else{
      var code = Math.round(900000*Math.random()+100000);
      var sql = "insert into users set ?"
      var data = { mobile: mobile, sms_code: code, created_at: new Date() };
      connection.query(sql,data,function(err, result){
        if (!err){
          var content = urlencode("验证码: " + code, "gb2312");
          var uri = config.smsServer + "?CorpID="+ config.corpId +"&Pwd="+ config.pwd +"&Mobile="+ mobile +"&Content="+ content +"&Cell=&SendTime=";
          console.log(uri);
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
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
