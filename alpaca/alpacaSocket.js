const WebSocket = require("websocket").w3cwebsocket;
//var auth = require("./auth");
//var monitor = require("../monitor");
var ws = WebSocket;
const moment = require("moment");
//const getData = require("./getData");

var EventEmitter2 = require("eventemitter2");

module.exports.event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});

function socketStatus(_status) {
	_socketStatus = _status;
	module.exports.event.emit("socketStatus", _status);
}

module.exports.load = (auth) => {
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
		module.exports.event.emit("dataCount", ["socketMessageCountReceived", 1]);
		module.exports.event.emit("dataCount", ["socketDataReceived", JSON.stringify(msg.data.length) * 2]);
		
		console.log(msg.data)
		try {
			console.log(msg)
			if (msg.stream) {
				console.log(msg.stream)
				switch (msg.stream) {
					case "authorization":
						console.log(msg.data)
						if (msg.data.status == "authorized" && msg.data.action == "authenticate") {
							console.log("Sucuess authenticating");
							socketStatus("connected");

							sendMessage({
								action: "listen",
								data: { streams: ["T.SPY","Q.SPY","AM.SPY","T.QQQ","Q.QQQ","AM.QQQ"] },
							});
							// sendMessage({
							// 	action: "listen",
							// 	data: { streams: ["T.SPY", "Q.SPY", "AM.SPY", "T.QQQ", "Q.QQQ", "AM.QQQ"]},
							// });
						} else if (msg.data.status == "unauthorized" && msg.data.action == "authenticate") {
							console.log("Error authenticating")
						} else if (msg.data.status == "unauthorized" && msg.data.action == "listen") {
							console.log("Awtaiting authentication");
						}
						break;
					case "listening":
						console.log(msg.data.streams);
						break;
					case "trade_updates":
						console.log(msg.data)
						break;
					case "":
						break;
				}

			}else {
				console.log(msg)
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
		socketStatus("ERROR");
	};

	ws.onclose = function (error) {
		socketStatus("disconnected");
		console.log(moment(Date.now()).format() + ": echo-protocol Connection Closed");
		console.log(error);
		//debugger
		setTimeout(module.exports.load, 10000);
	};
};

function sendMessage(message) {
	ws.send(JSON.stringify(message))
}
