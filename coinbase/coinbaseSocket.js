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

		watchlist = ["BTC-USD","ETH-USD","LTC-USD","ETC-USD","BCH-USD","XLM-USD"]

		ws.send(JSON.stringify({
			type: "subscribe",
			product_ids: watchlist,
			channels: ["ticker","full","heartbeat"]
		}))

	};

	ws.onmessage = function (data) {
		if (_socketStatus != "connected") socketStatus("connected");
		module.exports.event.emit("dataCount", ["socketMessageCountReceived", 1]);
		module.exports.event.emit("dataCount", ["socketDataReceived", data.data.length * 2]);

		data = JSON.parse(data.data)
		module.exports.event.emit("dataCount", [data.type, 1]);
		module.exports.event.emit("data", data);
	};

	ws.onerror = function (error) {
		console.log(error);
		socketStatus("error");
	};

	ws.onclose = function (error) {
		socketStatus("close", error);
		console.log(moment(Date.now()).format() + ": Coinbase Connection Closed");
		console.log(error);
		setTimeout(module.exports.load, 10000);
	};
};