const fs = require("fs");
const moment = require("moment");
var monitor = require("./monitor.js").monitor;

var clientConnections = Object.create(null); // {}

const https = require("https");
var WebSocketServer = require('ws').Server;
var httpsServer = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
}).listen(7999);
var socketService = new WebSocketServer({server: httpsServer});


var EventEmitter2 = require("eventemitter2");

//monitor.event.on("*", sendToClients(msg))

socketService.on('connection', function connection(socket) {
    console.log(socket)
    socket.on('message', msg => {
        clientConnections[socket].message(JSON.parse(msg))
        console.log(`Received messages from ${socket._socket.remoteAddress}`, msg)
    })
        
    socket.on('open', msg => {
        console.log("Connected to Server ", msg);
        clientConnections[socket] = new ClientConnection(socket)
    })

    socket.on('close', () => {
        delete clientConnections[socket]
    })
})


class ClientConnection {

    
    socket = Object.create(null);
    monitor = []

    _requestid = 0; 
    _msgcount = 0; 
    _packetcount = 0; 
    _socketStatus = "disconnected";
    sendQueue = []
    sendHistory = [] 
    recHistory = []
    callbacks = []
    socketStatus(_status) {
        _socketStatus = _status
        module.exports.event.emit("socketStatus" , _status)
    }
    requestid(){return _requestid += +1;};
    msgcount(){return _msgcount += +1;};
    packetcount(){return _packetcount += +1;};


    constructor(socket) {
		this.socket = socket;
        console.log("Connected to Client", socket);

        let login = JSON.stringify({
            response: [
                {
                    service : "ADMIN",
                    requestid : this.requestid(),
                    command : "LOGIN",
                    timestamp : Date.now(),
                    content : {
                        code: 0,
                        msg: "29-3"
                    }
                }
            ]
        });

        console.log(moment(Date.now()).format(), login)
        this.socket.send(login);
    }

    message = (msg) => {
        switch (msg.service) {
            case "ADMIN":
                switch (msg.command) {
                    case "LOGIN":
                        if (msg.username === "demo" && msg.password === "password") {
                            this.send({
                                response: [
                                    {
                                        service: "LOGIN",
                                        command: msg.command,
                                        content: "OK",
                                        requestid: msg.requestid,
                                        timestamp: Date.now(),
                                    },
                                ],
                            });
                        }
                        setInterval(executeSendQueue, 200)

                        break;
                        
                    case "SETCOMMANDKEY":
                        if (auth.checkCommandKey(msg.commandKey)) {
                            //clientConnections[socket] = msg.username
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
            case "MONITOR":
                switch (msg.command) {
					case "ADD":
						msg.content.map((key) => {
							this.monitor[key] = { watch: true, getChartHistory: false };
							monitor.products[key].event.on("*", (data) => {
								this.send(data);
							});
						});
					case "REMOVE":
						msg.content.map((key) => {
							this.monitor[key] = { watch: false, getChartHistory: false };
							monitor.products[key].event.on("*", (data) => {
								this.send(data);
							});
						});
				}
        }
    }


    send = (service, message) => {
        //console.log(clientSockets[socket])
        //console.log(`tosendmessage`, JSON.stringify(message))
        if (socket.readyState === 1 ){
            console.log(moment(Date.now()).format(), service, message)
            this.socket.send(JSON.stringify(message))
        }
    }

    addToSendQueue = (msg) => {
        console.log(msg)
    }

    executeSendQueue = () => {
        this.socket.send(JSON.stringify(this.sendQueue))
    }
    send = (msg) => {this.socket.send(JSON.stringify(msg))}

    login = () => {
        this.socket.send(JSON.stringify({
            request: [
                {
                    service: "ADMIN",
                    requestid: this.requestid(),
                    command: "LOGIN",
                    timestamp: Date.now(),
                    content: {
                        code: 0,
                        msg: "29-3"
                    }
                }
            ]
        }))
    }
}




















const { send } = require('process');

function sendToClient(socket,message) {
    //console.log(clientSockets[socket])
    //console.log(`tosendmessage`, JSON.stringify(message))
    if (socket.readyState === 1 ){
        console.log(`Sending message`, JSON.stringify(message))
        socket.send(JSON.stringify(message))
    }
}



function sendToClients(message) {
    if (clientConnections.length > 0) {
        clientConnections.forEach( client => {
            if ( client.readyState === 1 ){
                //console.log("Sending" , JSON.stringify(message))
                client.send(JSON.stringify(message))
            }
        });
    }
}


module.exports = {
    ClientConnections: clientConnections,
    socketService: socketService,
    sendToClients : sendToClients
}