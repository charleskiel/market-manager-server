
const moment = require('moment');
const mysql = require('mysql');

con = mysql.createConnection({
     host: 'localhost',
     user: 'root',
     password: 'Alabama!9044013083828789',
     database: 'marketmanager'
 });
 
module.exports.query = (str) =>{

     
     con.query(str, function (error, results, fields) {
          if (error) { 
               console.log(error.sql);
         console.log(moment(Date.now()).format() + error);
         //process.exit();
     }
     })
}