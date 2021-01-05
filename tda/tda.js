const fs = require('fs');
const _ = require('lodash')
const moment = require('moment');
const os = require('os')
//const monitor = require('../monitor').monitor;
const account = require('./account')
const auth = require('./auth')
const watchlists = require('./watchlists')
const socket = require('./tdaSocket.js');

module.exports.getData = require('./getdata')

module.exports.socket = socket;

module.exports.account = account
module.exports.status = account.status

module.exports.getData.event.on("getData", (data) => socket.emit("http|" + data[0],data[1],data[2]))
module.exports.aggregate = () => {
	collect = false;
    if (moment().day() == 0 && moment().hour() - 7 < 16 ){
        collect = true;
    } else if (moment().day() == 6) {
		collect = true;
	} else if (moment().day() < 0 && moment().day() > 5 && moment().hour() - 7 < 6 && moment().hour() - 7 > 16) {
		collect = true;
	}
	return collect;
};

// function getPriority(pid) { return os.getPriority(pid) }
// function setPriority(id, priority) { return os.setPriority(id, priority) }


module.exports.load = () => { 
    auth.refresh().then(() => {
        watchlists.fetchWatchlists().then( (lists) => {
            console.log(lists)
            //debugger
            socket.load()
            account.watch()
            })
        }
    )
}

module.exports.status = () => {
    
    return {
		service: "TDAstatus",
		timestamp: Date.now(),
		
		app: {
			systemtime: Date.now(),
			socket: socket.status,
			account: account.status(),
			uptime: process.uptime(),
		},
		actives: require("../monitor").monitor.actives,
    };
    
}



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

setInterval(function () {
	account.status();
	//tradier.status()
	//alpaca.status()
}, 10000);
