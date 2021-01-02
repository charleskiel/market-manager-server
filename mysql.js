
const moment = require('moment');
const mysql = require('mysql');
const mysqlAuth = require('./auth/mysql.js').auth;

con = mysql.createPool({
     host: mysqlAuth.host,
     user: mysqlAuth.user,
     password: mysqlAuth.password,
     database: mysqlAuth.database,
});

module.exports = {
     writeCount : this.getWriteCount,
     readCount: this.getReadCount,
     query : query
}

let _readCount = 0
let _writeCount = 0

function getReadCount() {return _readCount}
function getWriteCount(){return _writeCount}
function addReadCount() {_readCount += 1}
function addWriteCount(){_writeCount += 1}

function query (str, callback, params){
     ts = Date.now()
     return new Promise((result,fail) =>{
          //console.log(str)

          if (str.includes("select")) {addReadCount()} else {addWriteCount()}
          module.exports.writecount +=1
          con.query(str, function (error, results, fields) {
               if (error !== null) {
                    console.log(moment(Date.now()).format(),error,str)
                    fail(error)
               };
               //process.exit();
               if (results){
                    if (callback) {callback(rows, fields,error)}
                    results.ts = Date.now() - ts 
                    if (params) results.params = params
                    result(results)
               }
          })
     })
}
