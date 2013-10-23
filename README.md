sms
===

check user weibo info(signup date, followers count, validate repost a feed) and send sms to user mobile for auth user.

developed by Node.js + Mysql

node modules: Express + mysql + db-migrate + request + urlencode + sinalogin + underscore
 
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
      smsServer:
      corpId:
      pwd:

#### weibo account

  config weibo account for get cookie

    vi App.root/config/config.js
      weiboEmail:
      weiboPassword:

  if login cookie is outdated, u can do as this:
    
    cd App.root
    node request_with_cookie.js
    if return this: {"error":"auth faild!","error_code":21301,"request":"/2/users/domain_show.json"}
    this means cookie is outdated!
    
    how update a new cookie, do as this:
    cd App.root
    node get_login_cookie.js
    if give '需要验证码'
    you can find captcha in App.root/pinpincode.png, pls input code
    else
    directly print body in terminal.
    all that will save new cookie in App.root/{weibo_email_address}.dat
    
    last you must copy {weibo_email_address}.dat content to App.root/cookie.txt
    
    Okay, the new cookie has updated.
    
#### Start Node

    node app
  
  visit http://localhost:3000

That's All, JUST DO IT!!!
  

