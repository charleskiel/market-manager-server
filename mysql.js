
const moment = require('moment');
const mysql = require('mysql');
const mysqlAuth = require('./auth/mysql.js').auth;

con = mysql.createPool({
     host: mysqlAuth.host,
     user: mysqlAuth.user,
     password: mysqlAuth.password,
     database: mysqlAuth.database,
     multipleStatements: true
});

module.exports = {
     getStats: getStats,
     query: query,
     init : init,
     log : log
     
}

let _readCount = 0
let _writeCount = 0
let _errorCount = 0
function getStats() {
     return {
          readCount : _readCount,
          writeCount : _writeCount,
          errorCount: _errorCount,
     }
}
function getReadCount() {return _readCount}
function getWriteCount(){return _writeCount}
function addReadCount() {_readCount += 1}
function addWriteCount() { _writeCount += 1 }
function init() {
     // query(`
     //      DROP PROCEDURE IF EXISTS insert_column;

     //      CREATE PROCEDURE insert_column (tableName VARCHAR(255),columnName VARCHAR(255))

     //      BEGIN 
     //           IF NOT EXISTS (
     //                SELECT null FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = tableName AND table_schema = 'marketmanager' AND column_name = columnName)
     //           THEN 
     //                ALTER TABLE tableName ADD COLUMN columnName int NOT NULL default '0';
     //           END IF;
     //      END;
     // `)
}

function query (str, callback, params){
     ts = Date.now()
     return new Promise((result,fail) =>{
          //console.log(str)

          module.exports.writecount +=1
          con.query(str, function (error, results, fields) {
               if (error !== null) {
                    _errorCount += 1
                    console.log(moment(Date.now()).format(),error,str)
                    fail(error)
               };
               //process.exit();
               if (results){
                    if (str.includes("select")) {addReadCount()} else {addWriteCount()}
                    if (callback) {callback(rows, fields,error)}
                    results.ts = Date.now() - ts 
                    if (params) results.params = params
                    result(results)
               }
          })
     })
}

function log(_class, _service, _type, _message) {
     query(`INSERT INTO event_log (\`timestamp\`, class, service, \`type\`, message) VALUES (${Date.now()},'${_class}', '${_service}', '${_type}', '${_message}');`)
     
}