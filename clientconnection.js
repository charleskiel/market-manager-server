const _ = require("lodash");
const fs = require("fs");
const moment = require("moment");
var monitor = require("./monitor.js");
var productClass = require("./productClass.js");
const http = require("http");
var WebSocketServer = require('ws').Server;
var httpServer = http.createServer().listen(7999);

var EventEmitter2 = require("eventemitter2");
let event = new EventEmitter2({ wildcard: true, delimiter: ".", newListener: false, removeListener: false, verboseMemoryLeak: false, ignoreErrors: false, });    

socketService = new WebSocketServer({ server: httpServer });
connections = []
_sessionid = 0
function sessionid(){this._sessionid += 1;return this._sessionid;}
//monitor.event.on("*", sendToClients(msg))

function load() {
        console.log("Loading Client Sockets")    
        socketService.on('connection', (socket) => {
            console.log(socket)
            try {connections[socket] = new ClientConnection(socket)}catch(e){console.log(e)}

        })
        event.on("*", (msg) => console.log(msg))
    }

function sendToClient(socket,message) {
    if (connections[socket].readyState === 1 ){
        event.emit(`msgClient`, message)
        connections[socket].socket.send(JSON.stringify(message))
    }
}

function sendToClients(message) {
    connections.forEach( client => {
        if ( client.readyState === 1 ){
            event.emit("msgAll" , message)
            client.send(JSON.stringify(message))
        }
    });
}

class ClientConnection {

    sessionid = 0
    socket = Object.create(null);
    remoteAddress = ""
    subs = []

    _requestid = 0; 
    _msgCountRx = 0; 
    _msgCountTx = 0; 
    _packetcount = 0; 
    _socketStatus = "disconnected";


    tickQueue = {}
    sendQueue = []
    sendHistory = [] 
    recHistory = []
    callbacks = []
    socketStatus(_status) {
        _socketStatus = _status
        module.exports.event.emit("socketStatus" , _status)
    }
    requestid = () => {this._requestid += 1;return this._requestid;}
    msgCountRx = () => {this._msgCountRx += 1;return this._msgCountRx;}
    msgCountTx = () => {this._msgCountRx += 1;return this._msgCountRx;}
    packetcount = () => {this._packetcount += 1;return this._packetcount;}


    constructor(socket) {
        this.socket = socket;
        this.remoteAddress = socket._socket.remoteAddress

        this.socket.on('open', msg => {console.log("Connected to Server ", msg);})
        this.socket.on('close', () => {delete connections[socket]})
        this.socket.on('message', msg => {
            this.message(JSON.parse(msg))
            console.log(`Rx messages from ${this.socket._socket._peername.address}`, msg)
            event.emit("msg", { address : this.socket._socket._peername.address, msg })
        })
        
        productClass.event.on("*", (data) => this.send(data))
        monitor.event.on("ACTIVES_OPTIONS", (data) => this.send(data))
        monitor.event.on("ACTIVES_NASDAQ", (data) => this.send(data))
		monitor.event.on("ACTIVES_NYSE", (data) => this.send(data))
		monitor.event.on("ACTIVES_OTCBB", (data) => this.send(data))
        //event.on("*", (data) => this.sendSubs(data))
        this.login()
    }

    message = (msg) => {
        this.msgCountRx()
        //console.log(msg)
        switch (msg.service) {
            case "ADMIN":
                switch (msg.command) {
                    case "LOGIN":
                        if (msg.username === "demo" && msg.password === "password") {
                            this.sessionid = sessionid()
                            this.send({
                                response: [
                                    {
                                        service: "ADMIN",
                                        command: msg.command,
                                        content: "OK",
                                        sessionid: this.sessionid,
                                        requestid: msg.requestid,
                                        timestamp: Date.now(),
                                    },
                                ],
                            });
                        }
                        setInterval(this.executeSendQueue, 200)
                        break;
                        
                    case "SETCOMMANDKEY":
                        if (auth.checkCommandKey(msg.commandKey)) {
                            //connections[socket] = msg.username
                            this.send({
                                response: [
                                    {
                                        service: "ADMIN",
                                        command: msg.command,
                                        content: "OK",
                                        requestid: msg.requestid,
                                        timestamp: Date.now(),
                                    },
                                ],
		    				});
                        }
                        break;
                }
            case "SUB":
                switch (msg.command) {
                    case "ADD": this.addSubs(...msg.content.map((key))); break;
                    case "REMOVE": this.removeSubs(...msg.content.map((key))); break;
                    case "CLEAR": this.clearSubs(...msg.content.map((key))); break;
                    case "CLEAR": this.clearSubs();break;
                    case "TICKER":
                        () => { }
                        break;
                    case "TICKER":
                        () => { }
                        break;
                    case "HOME":
                        let keys = JSON.parse(fs.readFileSync("./dashboard.json", (err) => { if (err) console.error(err); }))
                        this.subs = [...keys.indexes, ...keys.metals]
                        break;
                    case 'DASHBOARD':
                        this.addSubs(["ACTIVES_OPTIONS", "ACTIVES_NASDAQ", "ACTIVES_NYSE", "ACTIVES_OTCBB"])
                        this.addSubs(["BTC-USD", "LTC-USD", "ACTIVES_NYSE", "ACTIVES_OTCBB"])
                        let actives = monitor.getActives()
                        this.send(monitor.getActives())

                }
            case "STATS":
                switch (msg.command) {
                    case "ADD":
                        msg.content.map((key) => {
                            this.subs[key] = { key: key, listen: true, watch: true, getChartHistory: false, msgCount: 0 };
                            monitor.products[key].event.on("*", (data) => { this.send(data)});
                        });
                        break;
                    case "REMOVE":
                        msg.content.map((key) => {
                            delete this.subs[key]
                        });
                        break;
                    case "CLEAR":
                        this.monitor.map(v => { monitor.products[v].event.removeListener("*", (data) => { this.send(data) }) })
                        this.monitor = []
                        break;
                                
                }
        }
                        
    }

    addSubs = (keys) => {
        keys.map((key) => {
            this.subs[key] = { key: key, listen: true, watch: true, getChartHistory: false, msgCount: 0 };
        });
    }
    removeSubs = (keys) => { keys.map((key) => {this.subs[key].listen = false})}
    clearSubs = () => { this.subs.map((key) => {this.subs[key].listen = false})}

    send = (msg) => {
        switch (msg.type) {
            case "quote":
            case "chart":
            case "timesale":
                if (this.subs[msg.key] && this.subs[msg.key].listen) {
                    console.log(`tosendmessage`, JSON.stringify(msg))
                    if (!this.tickQueue[msg.type]) this.tickQueue[msg.type] = []
                    this.tickQueue[msg.type].push(msg)
                }
                break;
            default:
                console.log(msg)
                this.sendQueue.push(msg)
        }
    }


    executeSendQueue = () => {
        if (this.socket.readyState === 1 && this.sendQueue.length > 0) {
            this.sendHistory.push(this.sendQueue[0])
            console.log(this.sendQueue[0])
            this.socket.send(JSON.stringify(this.sendQueue.shift()))
            this.msgCountTx()
        }
        if (this.socket.readyState === 1 && !_.isEmpty(this.tickQueue)) {
            this.socket.send(JSON.stringify(this.tickQueue))
            console.log(this.tickQueue)
            this.tickQueue = {}
            this.msgCountTx()
        }
    }
    //send = (msg) => {this.socket.send(JSON.stringify(msg))}


    login = () => {
        this.socket.send(JSON.stringify({
            request: [{
                service: "ADMIN",
                requestid: this.requestid(),
                command: "LOGIN",
                timestamp: Date.now(),
                content: {
                    code: 0,
                    msg: "29-3"
                }
            }]
        }))
    }

}




















const { send } = require('process');


module.exports = {
    ClientConnection : ClientConnection,
    load : load,
    sendToClient : sendToClient,
    sendToClients : sendToClients
}
