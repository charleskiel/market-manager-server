
const moment = require('moment');
const mysql = require('mysql');

module.exports.writecount = 0
con = mysql.createConnection({
     host: 'localhost',
     user: 'root',
     password: 'Alabama!9044013083828789',
     database: 'marketmanager'
 });
 
module.exports.query = (str) =>{

     module.exports.writecount +=1
     con.query(str, function (error, results, fields) {
          if (error) { 
               console.log(error.sql);
         console.log(moment(Date.now()).format() + error);
         //process.exit();
     }
     })
}
