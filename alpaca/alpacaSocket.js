const fs = require('fs');

const WebSocket = require("websocket").w3cwebsocket;
var ws = WebSocket;
const moment = require("moment");
//const getData = require("./getData");

var SocketData = require("../socketDataClass").SocketData;
let socketData = new SocketData("alpaca")
var EventEmitter2 = require("eventemitter2");
module.exports.socketData = socketData

module.exports.event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});

function emit(type, data, length) {
	module.exports.event.emit("data", data);
	socketData.data(type, length)
}
function socketStatus(_status) {
	socketData.setStatus(_status)
}


module.exports.load = () => {
	let auth = JSON.parse(fs.readFileSync("./auth/alpaca.json", (err) => { if (err) console.error(err); }))

	ws = new WebSocket("wss://data.alpaca.markets/stream");
	ws.onopen = function () {
		socketStatus("open");
		console.log(moment(Date.now()).format() + ": Connection opened");
		ws.send(
			JSON.stringify({
				"action": "authenticate",
				"data": {
					"key_id": auth.keyId,
					"secret_key": auth.secretKey
				}
			})
		);
	};

	ws.onmessage = function (msg) {
		module.exports.event.emit("dataCount", ["socketMessageCountRx", 1]);
		module.exports.event.emit("dataCount", ["socketDataRx", JSON.stringify(msg.data.length) * 2]);
		let dataLength = msg.data.length
		msg = JSON.parse(msg.data) 
		try {
			//console.log(msg)
			if (msg.stream) {
				//console.log(msg.stream)
				switch (msg.stream) {
					case "authorization":
						console.log(msg.data)
						if (msg.data.status == "authorized" && msg.data.action == "authenticate") {
							console.log("Sucuess authenticating");
							socketStatus("connected");
							setInterval(doMsgTxBuffer,200)
							// sendMessage({
							// 	action: "listen",
							// 	data: { streams: ["T.SPY","Q.SPY","AM.SPY","T.QQQ","Q.QQQ","AM.QQQ"] },
							// });
							// sendMessage({
							// 	action: "listen",
							// 	data: { streams: ["T.SPY", "Q.SPY", "AM.SPY", "T.QQQ", "Q.QQQ", "AM.QQQ"]},
							// });
						} else if (msg.data.status == "unauthorized" && msg.data.action == "authenticate") {
							console.log("Error authenticating")
							socketStatus("error");
						} else if (msg.data.status == "unauthorized" && msg.data.action == "listen") {
							console.log("Awtaiting authentication");
							socketStatus("open");
						}
						emit(msg.stream, msg, dataLength)
						break;
					case "listening":
						console.log(msg);
						emit(msg.stream, msg, dataLength)
						break;
					case "trade_updates":
						console.log(msg.data)
						emit(msg.stream, msg, dataLength)
						break;
					default:
						emit(msg.data.ev,msg,dataLength)
						break;
				}

			}else {
				//console.log(msg)
				emit(msg.type, msg, dataLength)

			}
		} catch (error) {
			console.log("\x1b[41m", error);
			console.log("\x1b[0m");
		}

		// if (message.data.charAt(0) === "{" && message.data.charAt(message.data.length - 1) === "}") {
		// 	packetPiece = "";
		// } else if (
		// 	(message.data.charAt(0) === "{" && message.data.charAt(message.data.length - 1) !== "}") ||
		// 	(message.data.charAt(0) !== "{" && message.data.charAt(message.data.length - 1) !== "}")
		// ) {
		// 	packetPiece += message.data;
		// } else if (message.data.charAt(0) !== "{" && message.data.charAt(message.data.length - 1) === "}") {
		// 	message.data = packetPiece + message.data;
		// }
	};

	ws.onerror = function (error) {
		console.log(error);
		socketStatus("error");
	};

	ws.onclose = function (error) {
		socketStatus("close", error);
		console.log(moment(Date.now()).format() + ": echo-protocol Connection Closed");
		console.log(error);
		//debugger
		setTimeout(module.exports.load, 10000);
	};
};


let msgTxBuffer = []
function sendMessage(message) {
	msgTxBuffer.push(message)
}

function doMsgTxBuffer() {
	if (ws.readyState === 1 && msgTxBuffer.length > 0) {
		//socketData.data(msg.stream, msgTxBuffer[0], JSON.stringify(msgTxBuffer[0]).length)
		
		ws.send(JSON.stringify(msgTxBuffer.shift()))
	}
}

module.exports.subscribe = (keys) => {
	//console.log([...keys.map(key => {return "T." + key}),...keys.map(key => {return "Q." + key}),...keys.map(key => {return "AM." + key})])
	sendMessage({
		action: "listen",
		data: { streams: [...keys.map(key => {return "T." + key}),...keys.map(key => {return "Q." + key}),...keys.map(key => {return "AM." + key})] },
	});
}