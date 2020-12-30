const fs = require('fs');
const request = require('request');
const _ = require('lodash')
const moment = require('moment');
const WebSocket = require('websocket').w3cwebsocket;
const os = require('os')
const mysql = require('../mysql.js');
//const monitor = require('../monitor').monitor;
const account = require('./account')
const auth = require('./auth')
const watchlists = require('./watchlists')


const getdata = require("./getdata").getData
const socket = require('./tdaSocket.js');

module.exports.socket = socket

module.exports.aggregate = function () {
	collect = false;
    if (moment().day() == 0 && moment().hour() - 7 < 16 ){
        collect = true;
    } else if (moment().day() == 6) {
		collect = true;
	} else if (moment().day() < 0 && moment().day() > 5 && moment().hour() - 7 < 6 && moment().hour() - 7 > 16) {
		collect == true;
	}
	return collect;
};

function getPriority(pid) { return os.getPriority(pid) }
function setPriority(id, priority) { return os.setPriority(id, priority) }

module.exports.chains = require("./getdata").chains


module.exports.getWatchlists = watchlists.fetchWatchlists
module.exports.accountData = account.accountData
var partmsg = ""
module.exports.load = function() { 
    auth.refresh().then(() => {

        watchlists.fetchWatchlists().then( (lists) => {
            console.log(lists)
            //debugger
            socket.load()
            })
        }
    )

}


module.exports.priceHistory = (key, params = null) => {
    return new Promise((result, error) => {
        //periodType: The type of period to show.Valid values are day, month, year, or ytd(year to date).Default is day.
        //period: The number of periods to show.
        //Example: For a 2 day / 1 min chart, the values would be:
        // period: 2
        // periodType: day
        // frequency: 1
        // frequencyType: min

        // Valid periods by periodType(defaults marked with an asterisk):

        // day: 1, 2, 3, 4, 5, 10 *
        // month: 1 *, 2, 3, 6
        // year: 1 *, 2, 3, 5, 10, 15, 20
        // ytd: 1 *

        let str = ""
        if (!params) {
            str = `https://api.tdameritrade.com/v1/marketdata/${key}/pricehistory?&periodType=day&period=10&frequencyType=minute&frequency=1&startDate=${moment(moment().utcOffset("-05:00").startOf("day").add(-30, "day").unix()) * 1000}`
        }else {
            str = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?&periodType=${params.periodType}&period=${params.period}&frequencyType=${params.frequencyType}&frequency=${params.frequency}&startDate=${params.startDate}`;
        }

        getdata(str)
            .then((data) => {result(data)})
            .catch((fail) => {error(fail)})
    })
}



module.exports.status = () => {
    return {
		service: "status",
		timestamp: Date.now(),
		os: {
			type: os.type,
			endiannes: os.endianness,
			hostname: os.hostname(),
			networkInterfaces: os.networkInterfaces(),
			platform: os.platform(),
			release: os.release(),
			totalmem: os.totalmem(),
		},
		system: {
			fremem: os.freemem(),
			uptime: os.uptime(),
			loadavg: os.loadavg(),
			uptime: os.uptime(),
		},
		app: {
			systemtime: Date.now(),
			socket: socket.status,
			account: account.status(),
			uptime: process.uptime(),
		},
		actives: require("../monitor").monitor.actives,
    };
    
}

function status(){
    getdata(`https://api.tdameritrade.com/v1/accounts?fields=positions,orders`)
        .then((data) => {
            account.tick(data)
            
            results = {
                service: "STATUS",
                timestamp: Date.now(),
                content: data,
            }
            dbWrite(results)
            watchPositions()
        }
    )
}


function watchPositions(){
    //console.log(account.status())
    if (socket.status = "connected" && account.positions()) {
        socket.event.emit("monitorAdd",account.positions().map(p => p.instrument.symbol))
    }
}


module.exports.state = () => {

    console.log({...monitor.list()})
    // console.log(test)
    return new Promise((result,error) =>{
        result({
                actives : monitor.actives,
                stocks : {...monitor.list()},
                account: account.status(),
                
                
            })
        error(fail)
    })
}



// var listener = socket.event.on("*", function (msg) {
//     //console.log(msg)
//     relayToClients(msg)
    
//     if (msg.content) {
//         if (msg.content.code == 17) {
// 			//console.log(`\x1b[35m ${msg.service} [${msg.code}] :: ${msg.content.msg}`);
//         } else {
//             msg.service = msg.service.toUpperCase()
//             switch (msg.service) {
//                 case "CHART_EQUITY":
//                 case "CHART_FUTURES":
//                 case "NEWS_HEADLINE":
//                     dbWrite(msg);
//                     //debugger;
//                     break;
//                 case "ACTIVES_NASDAQ":
//                 case "ACTIVES_NYSE":
//                 case "ACTIVES_OTCBB":
//                 case "ACTIVES_OPTIONS":
//                     dbWrite(msg);
//                     break;
//                 case "QUOTE":
//                 case "LEVELONE_FUTURES":
//                 case "TIMESALE_FUTURES":
//                 case "TIMESALE_EQUITY":
//                     break;
//                 case "SERVICE":
//                     console.log(msg.service + ": " + msg.content);
//                     console.log(moment(Date.now()).format() + `: Default Message`, msg);
//                     break;
//                 default:
//                     console.log(msg.service + ": " + msg.content);
//                     console.log(moment(Date.now()).format() + `: Default Message`, msg);
//                     break;
//             }
//         }
//     }
// })

// function sendMsg(c){
//     ws.send(JSON.stringify(c));
// };


// function dbWrite(data){
//     let color = ""
//     if (data.content) {
//         let timestamp = data.timestamp;
            
//         //console.log(data.content)
//         data.content.map(_content => {
//             let str = "";
//             let timestamp = data.timestamp;
//             switch (data.service.toUpperCase()) {
//                 case "ACTIVES_NYSE":
//                 case "ACTIVES_NASDAQ":
//                 case "ACTIVES_OPTIONS":
//                 case "ACTIVES_OTCBB":
//                     //Teal
//                     // color = "\x1b[36m"
//                     // if (data.service == "ACTIVES_OPTIONS") debugger;
//                     // str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + timestamp + ",'" + mysql_real_escape_string(JSON.stringify(_content)) + "') ON DUPLICATE KEY UPDATE content='" + mysql_real_escape_string(JSON.stringify(_content)) + "';"
//                     //socket.event.emit("monitorAddActives",data)
//                     break;
//                 case "QUOTE":
//                 case "LEVELONE_FUTURES":
//                     //Magenta
//                     color = "\x1b[35m"
//                     //str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "') ON DUPLICATE KEY UPDATE content='"+ mysql_real_escape_string(JSON.stringify(_content)) + "';"
//                     break;
//                 case "CHART_EQUITY":
//                 case "CHART_FUTURES":
//                     color = "\x1b[31m";
//                     if (data.service.toUpperCase() == "CHART_FUTURES") {
//                         str = `INSERT INTO ${data.service} (\`key\`,\`timestamp\`,h,l,o,c,v) VALUES ('${_content.key}',${_content["1"]},${_content["3"]},${_content["4"]},${_content["2"]},${_content["5"]},${_content["6"]}) ON DUPLICATE KEY UPDATE h=${_content["3"]},l=${_content["4"]},o=${_content["2"]},c=${_content["5"]},v=${_content["6"]};`;
//                         //debugger;
//                     } else if (data.service.toUpperCase() == "CHART_EQUITY") {
//                         //debugger;
//                         if (_content["5"] < 0) {_content["5"] = 0}
//                         str = `INSERT INTO ${data.service} (\`key\`,\`timestamp\`,h,l,o,c,v) VALUES ('${_content.key}',${_content["7"]},${_content["2"]},${_content["3"]},${_content["1"]},${_content["4"]},${_content["5"]}) ON DUPLICATE KEY UPDATE h=${_content["2"]},l=${_content["3"]},o=${_content["1"]},c=${_content["4"]},v=${_content["5"]};`;
//                     }
//                     break;
//                 case "TIMESALE_OPTIONS":
//                     console.log(moment(timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] ::  \x1b[37m \x1b[40m`, data);
//                 case "TIMESALE_FUTURES":
//                     //Bright Green
//                     color = "\x1b[92m"
//                     //str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "') ON DUPLICATE KEY UPDATE content='"+ mysql_real_escape_string(JSON.stringify(_content)) + "';"
//                     break;
//                 case "NEWS_HEADLINE":
//                     console.log(moment(timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] ::  \x1b[37m \x1b[40m`, data);
//                     break;
//                 case "STATUS":
//                     //Blue
//                     color = "\x1b[5m"
//                     //console.log(moment(timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] :: ${JSON.stringify(data.content)}\x1b[37m \x1b[40m`);
//                     str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "') ON DUPLICATE KEY UPDATE content='"+ mysql_real_escape_string(JSON.stringify(_content)) + "';"
//                     break;
//                 default:
//                     color = "\x1b[5m"
//                     //console.log(moment(timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] ::  \x1b[37m \x1b[40m` , JSON.stringify(data.content) );
//                     //str = "INSERT INTO `" + data.service.toUpperCase() + "` (timestamp,content) VALUES (" + timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "') ON DUPLICATE KEY UPDATE content='"+ mysql_real_escape_string(JSON.stringify(_content)) + "';"
//                     //Blue
                    
//                     break;
//             }


//             //console.log("\x1b[40m")
//             //console.log("\x1b[37m")

//             if (str != "") {
//                 //console.log(str)
//                 mysql.query(str)
//                 //mysql.query(str).then(result => {console.log(result)})
//             }
            
//         })
//     } else {
//         console.log(moment(timestamp).format("LTS") + color + ` [${data.service.padEnd(12, " ")}]  ::  ` , JSON.stringify(data.content) + `\x1b[37m \x1b[40m`);
//     }

// }

function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
}












// const https = require('https');
// const { send } = require('process');
// var httpsServer = https.createServer({
//     key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
//     cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
// }).listen(7999);


// var WebSocketServer = require('ws').Server;
// var clientSocket = new WebSocketServer({server: httpsServer});

// var clientSockets = Object.create(null);

// clientSocket.on('connection', function connection(socket) {

// console.log(socket)
// 	socket.on('message', msg => {
//         console.log(`Received messages from ${socket._socket.remoteAddress}`, msg)

//         msg = JSON.parse(msg)
//         msg.requests.map((m) => { 
//             console.log(`Received msg from ${socket._socket.remoteAddress}`,msg)
//             switch (m.service) {
//                 case "ADMIN":
//                     switch (m.command){
//                         case "LOGIN":
//                             if( m.username === "demo" && m.password === "password"){
//                                 clientSockets[socket] = {username : m.username, socket : socket, clientMonitor: []}
//                                 sendToClient(socket,{hello: "Hello!"})
//                             }
//                             break;
//                         case "SETCOMMANDKEY":
//                             if(auth.checkCommandKey(m.commandKey)){
//                                 clientSockets[socket] = m.username
//                                 sendToClient(socket,{
//                                     response: [
//                                         {
//                                             service: "ADMIN",
//                                             command: "SETTING",
//                                             setting: {commandKeyStatus: "granted"},
//                                             requestId: m.requestId,
//                                         },
//                                     ]
//                                 })

//                             break;}
//                     }
//             }
        
//             if (msg.me == "login") {
//                 //clientSockets[socket] = new user(msg.data, socket, loggedin)
//                 console.log(`Logged in: ${JSON.stringify(clientSockets[socket])}`)
//                 //clientSockets[socket].socket.send(JSON.stringify(clientSockets[socket]))
//             }
//         })
        
//     })

// 	socket.on('open', msg => {
//         console.log("Connected to Server ", msg);

//         let login = JSON.stringify({
//             response: [
//                 {
//                     service : "ADMIN", 
//                     requestId : "1", 
//                     command : "LOGIN", 
//                     timestamp : 1400593928788, 
//                     content : {
//                         code: 0, 
//                         msg: "29-3"
//                     }
//                 }
//             ]
//         });
        
//         console.log(moment(Date.now()).format(), login)
//         this.socket.send(login);
// 	})


// })


// function sendToClient(socket,message) {
//     //console.log(clientSockets[socket])
//     //console.log(`tosendmessage`, JSON.stringify(message))
    
	
//     if (socket.readyState === 1 ){
//         console.log(`Sending message`, JSON.stringify(message))
//         socket.send(JSON.stringify(message))
//     }
    	
// }



// function relayToClients(message) {
// 	clientSocket.clients.forEach( client => {
// 		if ( client.readyState === 1 ){
// 			//console.log("Sending" , JSON.stringify(message))
//           	client.send(JSON.stringify(message))
//         	}
//     	});
// }
