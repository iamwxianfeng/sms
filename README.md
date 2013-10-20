sms
===

send sms to user mobile

developed by Node.js + Mysql

node modules: Express + mysql + db-migrate + request + urlencode
 
## init Step By Step

#### DB

  config db:
  
    vi App.root/database.json

  create db:
  
    mysql -uroot -p -e "create database sms_development"

  create tables:
  
    db-migrate up

  if db-migrate cant find, you can do as this:

    cd App.root/node_modules/db-migrate
    npm link (maybe need sudo)

#### SMS Server

  config sms server account:
  
    cp App.root/config/config.js.sample App.root/config/config.js
    vi App.root/config/config.js

#### Start Node

    node app
  
  visit http://localhost:3000

That's All, JUST DO IT!!!
  

