var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  // 0 - sms send fail, 1 - sms send success
  db.addColumn('users','sms_status',{ type: 'int', defaultValue: 0 },callback);
};

exports.down = function(db, callback) {

};

