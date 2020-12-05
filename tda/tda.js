const fs = require('fs');
const request = require('request');
const _ = require('lodash')
const moment = require('moment');
const WebSocket = require('websocket').w3cwebsocket;
const os = require('os')
const mysql = require('../mysql.js');
const tdaSocket = require('./tdaSocket');
const monitor = require('./monitor')
const account = require('./account')
const auth = require('./auth')
const watchlists = require('./watchlists')


const getdata = require("./getdata").getData



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
            tdaSocket.load()
            })
        }
    )

}


module.exports.priceHistory = (req) => {
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
        if (req.frequency == "") {
            str = `https://api.tdameritrade.com/v1/marketdata/${req.symbol}/pricehistory?&periodType=&period=1&frequencyType=minute&frequency=1`
        }else{
            str = `https://api.tdameritrade.com/v1/marketdata/${req.symbol}/pricehistory?&periodType=${req.periodType}&period=${req.period}&frequencyType=${req.frequencyType}&frequency=${req.frequency}`
            
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
            type : os.type  ,
            endiannes : os.endianness,
            hostname : os.hostname(),
            networkInterfaces : os.networkInterfaces(),
            platform : os.platform(),
            release : os.release(),
            totalmem : os.totalmem(),
        },
        system: {
            fremem  : os.freemem(),
            uptime  : os.uptime(),
            loadavg :  os.loadavg(),
            uptime  : os.uptime()
        
        },
        app: {

            systemtime: Date.now(),
            tdaSocket: tdaSocket.status,
            account: account.status(),
            uptime: process.uptime()
        },
        actives : monitor.actives
    }
    
}

function status(){
    getdata(`https://api.tdameritrade.com/v1/accounts?fields=positions,orders`)
        .then((data) => {
            account.tick(data)
            
            results = {
                service: "status",
                timestamp: Date.now(),
                content: [{
                    systemtime: Date.now(),
                    databaseWriteCount: mysql.writecount,
                    account: data,
                }],
                actives : monitor.actives
            }
            dbWrite(results)
            watchPositions()
        }
    )
}


function watchPositions(){
    //console.log(account.status())
    if (tdaSocket.status = "connected" && account.positions()) {
        monitor.add(account.positions().map(p => p.instrument.symbol))
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



tdaSocket.event.on("*", function (msg) {
    //console.log(msg)
    relayToClients(msg)
    
    if (msg.content) {
        if (msg.response) {
            msg.response.forEach((m) => {
                switch (m.service) {
                    case "CHART_EQUITY":
                    case "ACTIVES_NASDAQ":
                    case "ACTIVES_NASDAQ":
                    default:
                    //console.log(moment(Date.now()).format() + `: Default Message ${msg}`)
                    console.log(m)
                    break;
                }
            });
        }
    }
})

function sendMsg(c){
    ws.send(JSON.stringify(c));
};


function dbWrite(data){
    let color = ""
    data.content.map(_content =>{
        let str = ""
        //console.log(moment(data.timestamp).format("h:mm:ss a") + `: INSERT INTO data (service,timestamp,content) VALUES ( '${data.service}', ${data.timestamp}, '${JSON.stringify(data.content)}');`);
        if (data.service === "ACTIVES_NYSE") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[33m"
        } //Yellow
        else if (data.service === "ACTIVES_NASDAQ") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[34m"
        } //Blue
        else if (data.service === "ACTIVES_OPTIONS") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[34m"
        } //Blue
        else if (data.service === "ACTIVES_OTCBB") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[36m"
        } //Teal
        else if (data.service === "QUOTE") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[35m"
        } //Magenta
        else if (data.service === "CHART_EQUITY") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[31m"
        } //Magenta
        else if (data.service === "CHART_FUTURES") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[35m"
        } //Magenta
        else if (data.service === "LEVELONE_FUTURES") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[32m"
        } //Green
        else if (data.service === "TIMESALE_FUTURES") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[92m"
        } //Bright Green
        else if (data.service === "NEWS_HEADLINE") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"

            } //Bright Green
        else if (data.service === "status")
        {
            color = "\x1b[93m";
        } //Blue
        else
        {
            //console.log(moment(data.timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] :: ${JSON.stringify(data.content)}\x1b[37m \x1b[40m`);
            str = "INSERT INTO `" + data.service.toUpperCase() + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[5m"
        }


        //console.log("\x1b[40m")
        //console.log("\x1b[37m")

        //let str = `INSERT INTO data (service,timestamp,content) VALUES ( '${data.service}', ${data.timestamp}, '${mysql_real_escape_string(JSON.stringify(_content))}');`
        //console.log(str)
        if (str) mysql.query(str)
    })
    //console.log(moment(data.timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] :: ${JSON.stringify(data.content)}\x1b[37m \x1b[40m`);

}

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

setInterval(status,10000)













const https = require('https');
const { send } = require('process');
var httpsServer = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
}).listen(7999);


var WebSocketServer = require('ws').Server;
var clientSocket = new WebSocketServer({server: httpsServer});

var clientSockets = Object.create(null);

clientSocket.on('connection', function connection(socket) {

console.log(socket)
	socket.on('message', msg => {
        console.log(`Received messages from ${socket._socket.remoteAddress}`, msg)

        msg = JSON.parse(msg)
        msg.requests.forEach((m) => { 
            console.log(`Received msg from ${socket._socket.remoteAddress}`,msg)
            switch (m.service) {
                case "ADMIN":
                    switch (m.command){
                        case "LOGIN":
                            if( m.username === "demo" && m.password === "password"){
                                clientSockets[socket] = {username : m.username, socket : socket, monitor: []}
                                sendToClient(socket,{hello: "Hello!"})
                            }
                            break;
                        case "SETCOMMANDKEY":
                            if(auth.checkCommandKey(m.commandKey)){
                                clientSockets[socket] = m.username
                                sendToClient(socket,{
                                    response: [
                                        {
                                            service: "ADMIN",
                                            command: "SETTING",
                                            setting: {commandKeyStatus: "granted"},
                                            requestId: m.requestId,
                                        },
                                    ]
                                })

                            break;}
                    }
            }
        
            if (msg.me == "login") {
                //clientSockets[socket] = new user(msg.data, socket, loggedin)
                console.log(`Logged in: ${JSON.stringify(clientSockets[socket])}`)
                //clientSockets[socket].socket.send(JSON.stringify(clientSockets[socket]))
            }
        })
        
    })

	socket.on('open', msg => {
        console.log("Connected to Server ", msg);

        let login = JSON.stringify({
            response: [
                {
                    service : "ADMIN", 
                    requestId : "1", 
                    command : "LOGIN", 
                    timestamp : 1400593928788, 
                    content : {
                        code: 0, 
                        msg: "29-3"
                    }
                }
            ]
        });
        
        console.log(moment(Date.now()).format(), login)
        this.socket.send(login);
	})


})


function sendToClient(socket,message) {
    console.log(clientSockets[socket])
    console.log(`tosendmessage`, JSON.stringify(message))
    
	
    if (socket.readyState === 1 ){
        console.log(`Sending message`, JSON.stringify(message))
        socket.send(JSON.stringify(message))
    }
    	
}



function relayToClients(message) {
	clientSocket.clients.forEach( client => {
		if ( client.readyState === 1 ){
			//console.log("Sending" , JSON.stringify(message))
          	client.send(JSON.stringify(message))
        	}
    	});
}
