
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

 var ripple = require('ripple-lib');
 var sjcl   = require('sjcl');
 require('./module_extensions/sjcl_sha512');
 var BigInteger = require('jsbn');
 require('./module_extensions/jsbn_jacobi');

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

var ZH_RSA_PRIVATE_KEY = config.ZH_RSA_PRIVATE_KEY;

var exponent   = new BigInteger(ZH_RSA_PRIVATE_KEY.e, 16);
var modulus    = new BigInteger(ZH_RSA_PRIVATE_KEY.n, 16);
var alpha      = new BigInteger(ZH_RSA_PRIVATE_KEY.a, 16);
var privateKey = new BigInteger(ZH_RSA_PRIVATE_KEY.d, 16);


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

function fdh(dataBits, bytelen) {
  var bitlen = bytelen << 3;
  if (typeof dataBits === "string") {
    dataBits = sjcl.codec.utf8String.toBits(dataBits);
  }
  var counter = 0, output = [];
  while (sjcl.bitArray.bitLength(output) < bitlen) {
    var hash = sjcl.hash.sha512.hash(sjcl.bitArray.concat([counter], dataBits));
    output = sjcl.bitArray.concat(output, hash);
    counter++;
  }
  output = sjcl.bitArray.clamp(output, bitlen);
  return output;
}

function hash(signatureRequestHex) {
  return sigreqHash = sjcl.codec.hex.fromBits(fdh(sjcl.codec.hex.toBits(signatureRequestHex), 16));
}

function checkJacobi(signatureRequestHex) {
  var signatureRequest = new BigInteger(signatureRequestHex, 16);
  return signatureRequest.jacobi(modulus) === 1;
}

function sign(signatureRequestHex) {
  if (checkJacobi(signatureRequestHex)) {
    var signatureRequest = new BigInteger(signatureRequestHex, 16);
    var blindedSignature = signatureRequest.modPow(privateKey.multiply(new BigInteger("2",16)), modulus)
    return blindedSignature.toString(16);
  } else {
    return false;
  }
}

// add login cookie data
var data = fs.readFileSync("./cookie.txt", 'utf-8');
var cookies = data.split('\n');

var j = request.jar();

cookies.forEach(function(cookie){
  j.add(new Cookie(cookie));
});

// check weibo and send sms to user phone
app.post("/submit_sms", function(req, res){
  var weibo_permalink = req.param('weibo_permalink');
  var sms_number = req.param('sms_number');
  var signature_request = req.param('signature_request');
  if (!/^http:\/\/weibo.com/.test(weibo_permalink) || !/^1[3|4|5|8][0-9]\d{4,8}$/.test(sms_number)){
    res.send({ status: '_INVALID_PARAMETERS' });
    return;
  }
  if (!checkJacobi(signature_request)){
    res.send({ status: '_INVALID_PARAMETERS' });
    return;
  }
  connection.query("select * from users where status = 1 and mobile =" + connection.escape(sms_number), function(err, result){
    if (result && result.length > 0){
      res.send({ status: '_USED_PHONE_NUMBER' });
      return;
    }
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    connection.query("select * from users where status = 1 and ip = "+ connection.escape(ip), function(err, result){
      if (result && result.length > 0){
        res.send({ status: '_DUPLICATE_IP' });
        return;
      }
      var uid = weibo_permalink.match(/(\d+)/)[1];
      connection.query("select * from users where status = 1 and weibo = "+ connection.escape(uid), function(err, result){
        if (result && result.length > 0){
          res.send({ status: '_DUPLICATE_ACCOUNT' });
          return;
        }

        var uri = "http://api.weibo.com/2/users/show.json?source=211160679&uid=" + uid;
        request({ url: uri, jar: j }, function(err, response, body){
          var ret = JSON.parse(body);
          // console.log(ret);
          if (ret.error){
            res.send({ status: '_INELIGIBLE' });
            return;
          }
          if (ret.created_at < "2013-10-01" || ret.followers_count < 20){
            res.send({ status: '_INELIGIBLE' });
            return
          }
          var text = ret.status.text;
          var str = text.replace(/\s/g,'');
          var hsh = str.substring(str.length - 32, str.length);
          if (hash(signature_request) != hsh) {
           res.send({ status: '_INVALID_POST' });
           return;
         }
         var code = Math.round(900000*Math.random()+100000);
         var content = urlencode("欢迎参加 Ripple 中国赠送! 您的验证码是: " + code, "gb2312");
         var uri = config.smsServer + "?CorpID="+ config.corpId +"&Pwd="+ config.pwd +"&Mobile="+ sms_number +"&Content="+ content +"&Cell=&SendTime=";
         request(uri, function(err, response, body){
          if (!err && response.statusCode == 200 && body > 0) {
            var data = { mobile: sms_number, weibo: uid, sms_code: code, signature_request: signature_request, ip: ip, sms_status: 1 };
            connection.query("insert into users set ?", data, function(err, result){
              res.send({ status: '_SUCCESS' });
            });
          }
        });
       });
});
});
});
});

// verify sms code
app.post("/verify_sms", function(req, res){
  var sms_verification = req.param('sms_verification');
  connection.query("select * from users where status = 0 and sms_code = " + connection.escape(sms_verification), function(err, result){
    if (result && result.length == 0){
      res.send({ status: '_INVALID_VERIFICATION' });
      return;
    }
    var signature_request = result[0].signature_request;
    var signature = sign(signature_request);
    connection.query("update users set status = 1 where sms_code = " + connection.escape(sms_verification), function(err, result){
      res.send({ signature: signature });
    });
  })
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

