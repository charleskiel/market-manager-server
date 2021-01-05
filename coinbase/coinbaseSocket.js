const WebSocket = require("websocket").w3cwebsocket;
//var auth = require("./auth");
var ws = WebSocket;
const moment = require("moment");

var EventEmitter2 = require("eventemitter2");
var SocketData = require("../socketDataClass").SocketData;

let socketData = new SocketData("coinbase")
module.exports.socketData = socketData
let _socketStatus = "idle"
module.exports.event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});

function emit(type, data) {
	module.exports.event.emit("data", data);
	socketData.data(data.type, dataLength)
}

function socketStatus(_status) {
	socketData.setStatus(_status)
	_socketStatus = _status
}

module.exports.load = (auth) => {
	ws = new WebSocket("wss://ws-feed.pro.coinbase.com");
	ws.onopen = function () {
		socketStatus("open");
		console.log(moment(Date.now()).format() + ": Connection opened");

		watchlist = ["BTC-USD","ETH-USD","LTC-USD","ETC-USD","BCH-USD","XLM-USD"]

		ws.send(JSON.stringify({
			type: "subscribe",
			product_ids: watchlist,
			channels: ["ticker","full","heartbeat"]
		}))

	};

	ws.onmessage = function (data) {
		if (_socketStatus !== "connected") {
			socketStatus("connected");
		}
		dataLength = data.data.length * 2;

		data = JSON.parse(data.data)
		emit(data.type, data)
	};

	ws.onerror = function (error) {
		console.log(error); socketStatus("error");
	};

	ws.onclose = function (error) {
		socketStatus("close", error);
		setTimeout(module.exports.load, 3000);
	};
};