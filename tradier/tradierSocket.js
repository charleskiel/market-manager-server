const WebSocket = require("websocket").w3cwebsocket;
//var auth = require("./auth");
//var monitor = require("../monitor");
var ws = WebSocket;
const moment = require("moment");
const getData = require("./getData");
var SocketData = require("../socketDataClass").SocketData;
let socketData = new SocketData("tradier")
let _socketStatus = "idle"
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
function emit(type, data, dataLength) {
	module.exports.event.emit("data", data);
	socketData.data(type, dataLength)
}
function socketStatus(_status) {
	socketData.setStatus(_status)
	_socketStatus = _status
}

let session = {}
module.exports.load = () => {
	getData.getStreamingSession().then((result) => {
		console.log(result);
		session = result.stream
	});

	ws = new WebSocket("wss://ws.tradier.com/v1/markets/events");
	ws.onopen = function () {
		socketStatus("open");
		console.log(moment(Date.now()).format() + ": Connection opened with " + session.sessionid);
		ws.send(
			JSON.stringify({
				"symbols": ["SPY","QQQ"],
				"sessionid": session.sessionid,
				"linebreak": false,
				"advancedDetails" : true
			})
		);
	};

	ws.onmessage = function (data) {
		if (_socketStatus !== "connected") socketStatus("connected")
		let dataLength = data.data.length * 2
		data = JSON.parse(data.data)
		module.exports.event.emit(data.type, data, dataLength);

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


		//{"type":"quote","symbol":"SPY","bid":373.44,"bidsz":9,"bidexch":"P","biddate":"1609447718000","ask":373.45,"asksz":6,"askexch":"Q","askdate":"1609447718000"}
		//{"type":"trade","symbol":"SPY","exch":"Q","price":"373.45","size":"100","cvol":"38311315","date":"1609447718018","last":"373.45"}
		//{"type":"trade","symbol":"QQQ","exch":"Q","price":"313.06","size":"100","cvol":"15510951","date":"1609447716742","last":"313.06"}
		//{"type":"quote","symbol":"SPY","bid":373.44,"bidsz":9,"bidexch":"Z","biddate":"1609447718000","ask":373.45,"asksz":6,"askexch":"Q","askdate":"1609447718000"}
		//{"type":"timesale","symbol":"QQQ","exch":"X","bid":"313.06","ask":"313.07","last":"313.06","size":"110","date":"1609447718210","seq":172047,"flag":"@","cancel":false,"correction":false,"session":"normal"}
		//{"type":"trade","symbol":"QQQ","exch":"X","price":"313.06","size":"110","cvol":"15511138","date":"1609447718210","last":"313.06"}
		//{"type":"quote","symbol":"SPY","bid":373.44,"bidsz":10,"bidexch":"P","biddate":"1609447718000","ask":373.45,"asksz":6,"askexch":"Q","askdate":"1609447718000"}

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


module.exports.sendServiceMsg = (_type, _keys) => {
	//console.log(_type);
	console.log(_type, [..._keys].toString());
	switch (_type) {
		case "equities":
		case "indexes":
			console.log(moment(Date.now()).format() + `: Subscribing to ${monitor.equities().length} ${_type}`);
			sendMsg({
				requests: [
					{
						service: "QUOTE",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,8,9,10,11,12,13,14,15,16,17,18,24,25,28,29,30,31,40,49",
						},
					},
					{
						service: "CHART_EQUITY",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4,5,6,7,8",
						},
					},
					{
						service: "TIMESALE_EQUITY",
						requestid: "2",
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4",
						},
					},
				],
			});
			break;
		case "futures":
			console.log(moment(Date.now()).format() + `: Subscribing to ${monitor.futures().length} futures `);
			sendMsg({
				requests: [
					{
						service: "CHART_FUTURES",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4,5,6,7",
						},
					},
					{
						service: "LEVELONE_FUTURES",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4,8,9,12,13,14,16,18,19,20,23,24,25,26,27,28,31",
						},
						// },{
						// 	service: "FUTURES_BOOK",
						// 	requestid: requestid(),
						// 	command: "SUBS",
						// 	account: auth.accountId(),
						// 	source: auth.appId(),
						// 	parameters: {
						// 		keys: [..._keys].toString(),
						// 		fields: "0,1,2,3,4,8,9,12,13,14,16,18,19,20,23,24,25,26,27,28,31",
						// 	},
					},
					{
						service: "TIMESALE_FUTURES",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4",
						},
					},
				],
			});

			break;
		case "options":
			sendMsg({
				requests: [
					{
						service: "TIMESALE_OPTIONS",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3",
						},
					},
				],
			});
			break;

		default:
			debugger;
	}
};
