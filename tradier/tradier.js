const fs = require('fs');
const request = require('request');
const _ = require('lodash')
const moment = require('moment');
const WebSocket = require('websocket').w3cwebsocket;
const mysql = require('../mysql.js');
//const monitor = require('../monitor')

const getData = require("./getData");
const socket = require('./tradierSocket.js');

module.exports.socket = socket
module.exports.getData = getData

getData.event.on("getData", (data) => socket.socketData.getData("http|" + data[0],data[1], data[2] ))
//module.exports.chains = require("./getdata").chains
var partmsg = ""
module.exports.load = function() { 
     // getData.getTimeSales("AMD", "1min", "2020-11-14 09:30", "2020-12-14 20:00")
     //      .then((result) => {
     //           console.log(result)
     //           debugger
     //           socket.load()
     //      });
     getData.getStreamingSession()
          .then((result) => {
               console.log(result)
               //debugger
               socket.load(result.stream.url, result.stream.sessionid);
          });

}

module.exports.aggregate = function() {
     collect = false
     time = moment(moment().utcOffset("-07:00")) ;
     if (moment().day() == 0 || moment().day() == 6){
          collect = true;
     } else if ((time.day() > 0 && time.day() < 5 ) && (time.hour() > 18 || time.hour() < 7) ){
          collect = true
     }

     //console.log(time.day(), time.hour(), collect)
     //console.log(time.format())
     return true
}