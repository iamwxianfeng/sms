var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable("users",{
    id: { type: 'int', primarykey: true, autoIncrement: true },
    email: 'string',
    name: 'string',
    mobile: { type: 'string', unique: true, notNull: true },
    sms_code: 'string',
    ip: { type: 'string', unique: true, notNull: true },
    status: { type: 'int', defaultValue: 0 }, // 0-user has verified, 1-user has verified
    created_at: 'datetime',
    updated_at: 'datetime'
  },callback);
};

exports.down = function(db, callback) {

};
