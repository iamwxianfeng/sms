var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addColumn('users','weibo','string',callback);
};

exports.down = function(db, callback) {

};
