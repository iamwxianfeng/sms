var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addColumn('users','signature_request','text',callback);
};

exports.down = function(db, callback) {

};
