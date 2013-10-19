var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable("users",{
    id: { type: 'int', primarykey: true, autoIncrement: true },
    email: 'string',
    name: 'string',
    mobile: 'string',
    sms_code: 'string',
    ip: 'string',
    status: { type: 'int', defaultValue: 0 }, // 0-notvalid, 1-valid
    created_at: 'datetime',
    updated_at: 'datetime'
  },callback)
};

exports.down = function(db, callback) {

};
