sms
===

send sms to user mobile

developed by Node.js + Mysql
node modules: Express + mysql + db-migrate + request + urlencode
 
init
====

DB
=====
  config db:
  >vi App.root/database.json

  create db:
  >mysql -uroot -p -e "create database sms_development"

  create tables:
  >db-migrate up

SMS Server
=====
  config sms server account:
  >cp App.root/config/config.js.sample App.root/config/config.js
  >vi App.root/config/config.js

Start Node
=====
  >node app
  visit http://localhost:3000

That's All, JUST DO IT!!!
  

