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
	ws = new WebSocket("wss://ws-feed.pro.coinbase.com");
	ws.onopen = function () {
		socketStatus("open");
		console.log(moment(Date.now()).format() + ": Connection opened");

		watchlist = ["ETH-USD","LTC-USD","XRP-USD","ETC-USD","BCH-USD"]

		ws.send(JSON.stringify({
			type: "subscribe",
			product_ids: watchlist,
			channels: [
				"level2",
				"full",
				"heartbeat",
				"ticker"
			]
		}))

	};

	ws.onmessage = function (data) {
		if (_socketStatus != "connected") socketStatus("connected");
		module.exports.event.emit("dataCount", ["socketMessageCountReceived", 1]);
		module.exports.event.emit("dataCount", ["socketDataReceived", data.data.length * 2]);

		//console.log(JSON.parse(data.data))
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

module.exports.sendServiceMsg = (_type, _keys) => {
	//console.log(_type);
	console.log(_type, [..._keys].toString());
	switch (_type) {
		case "equities":

	}
};
