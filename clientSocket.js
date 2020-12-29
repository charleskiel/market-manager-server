//const WebSocket = require('websocket').w3cwebsocket;
var WebSocketServer = require('ws').Server;
var socketService = new WebSocketServer({server: httpsServer});
var clientConnections = Object.create(null); // {}
var monitor = require("./monitor.js").monitor;


socketService.on('connection', function connection(socket) {
    console.log(socket)
    socket.on('message', msg => {
        clientConnections[socket].message(JSON.parse(msg))
        console.log(`Received messages from ${socket._socket.remoteAddress}`, msg)
        //     if (msg.me == "login") {
        //         //clientConnections[socket] = new user(msg.data, socket, loggedin)
        //         console.log(`Logged in: ${JSON.stringify(clientConnections[socket])}`)
        //         //clientConnections[socket].socket.send(JSON.stringify(clientConnections[socket]))
        //     }
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
    requestID = 0
    constructor(socket) {
        this.socket = socket
        this.login()
        
    }

    message = (msg) => {
        switch (msg.service) {
            case "ADMIN":
                switch (msg.command) {
                    case "LOGIN":
                        if (msg.username === "demo" && msg.password === "password") {
                            clientConnections[socket] = new ClientConnection(socket)
                            clientConnections[socket].send({ hello: "Hello!" })
                        }
                        break;
                        
                    case "SETCOMMANDKEY":
                        if (auth.checkCommandKey(msg.commandKey)) {
                            //clientConnections[socket] = msg.username
                            clientConnections[socket].send({
                                response: [
                                    {
                                        service: "ADMIN",
                                        command: "SETTING",
                                        setting: { commandKeyStatus: "granted" },
                                        requestId: msg.requestId,
                                    },
                                ],
                            });
                        }
                        break;
                }
            case "MONITOR":
                switch (msg.command) {
                    case "ADD":
                        msg.content.map(key => {
                            monitor.products[key].event.on("*", data => { send(data) })
                        })
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

    login = () => {
        clientConnections[socket].send({
            resquest: [
                {
                    service: "ADMIN",
                    requestId: "1",
                    command: "LOGIN",
                    timestamp: Date.now(),
                    content: { code: 0, msg: "00-1" },
                },
            ],
        });

        console.log(moment(Date.now()).format(), login);
        this.socket.send(login);
    }-
}


const { send } = require('process');
var httpsServer = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
}).listen(7999);

function sendToClient(socket,message) {
    //console.log(clientSockets[socket])
    //console.log(`tosendmessage`, JSON.stringify(message))
    if (socket.readyState === 1 ){
        console.log(`Sending message`, JSON.stringify(message))
        socket.send(JSON.stringify(message))
    }
}



function sendToClients(message) {
	clientConnections.forEach( client => {
		if ( client.readyState === 1 ){
			//console.log("Sending" , JSON.stringify(message))
          	client.send(JSON.stringify(message))
        }
    });
}


module.exports = {
    ClientConnections: ClientConnections,
    socketService: socketService,
    sendToClients : sendToClients
}