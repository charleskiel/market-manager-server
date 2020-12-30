var WebSocket = require("websocket").w3cwebsocket;
const auth = require("./auth")
const socketData = require("./socketData").tdaData
//const monitor = require("../monitor")
var ws = WebSocket
const moment = require("moment");
const Product = require("../productClass").Product;

var EventEmitter2 = require("eventemitter2");
const defaultFutures = [
	"/ES", // S&P 500
	"/EMD", // S&P MidCap 400
	"/NQ", // Nasdaq 100
	"/RTY", // Russell 2000
	
	"/MYM", // Dow Micro E-mini
	"/M2K", // Russle Micro E-mini
	"/MES", // S&P 500 Micro E-mini
	"/MNQ", // Nasdaq Micro E-mini
	"/YM", // Dow Jones Mini

	"/GC", // Gold
	"/MGC", // Gold E-Micro
	"/SI", // Silver 
	"/SIL", // Silver 1000/oz
	"/PL", // Platinum
	"/HG", // Copper
	
	
	"/DX", // US Dollar
	"/6C", // Canadian Dollar
	"/6N", // New Zeland Dollar
	"/6A", // Australian Dollar
	"/6M", // Mexican Peso
	"/6J", // Japanese Yen
	"/J7", // Japanese Yen E-Mini
	"/6E", // Euro FX
	
	"/M6A", // AUD/USD E-Micro
	"/M6E", // EUR/USD E-Micro
	"/BTC", // Bitcoin

	"/ZT", // 2 Year Treasury Note 
	"/ZF", // 5 Year Treasury Note 
	"/ZN", // 10 Year Treasury Note 
	"/ZB", // 30 Year Treasury Bond
	
	
	"/LBS", // Lumber
	"/NG", // Natural Gas
];

module.exports.event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});

let _requestId = 0; function requestId(){return _requestId += +1;};
let _msgcount = 0; function msgcount(){return _msgcount += +1;};
let _packetcount = 0; function packetcount(){return _packetcount += +1;};
let _socketStatus = "disconnected";

let sendQueue = []
let sendHistory = [] 
let recHistory = []
let callbacks = []
function socketStatus(_status) {
	_socketStatus = _status
	module.exports.event.emit("socketStatus" , _status)
}

module.exports.status = {
	socketStatus: _socketStatus,
	sendhistory: sendHistory,
	rechistory: recHistory,
	requestId : _requestId,
	msgcount : _msgcount,
	packetcount : _packetcount,
}

module.exports.load = () => {
	ws = new WebSocket("wss://streamer-ws.tdameritrade.com/ws");

	ws.onopen = function () {
		socketStatus("open")
		console.log(moment(Date.now()).format() + ": Connection opened");
		console.log({
			requests: [
				{
					service: "ADMIN",
					command: "LOGIN",
					requestId: requestId(),
					account: auth.accountId(),
					source: auth.appId(),
					parameters: {
						credential: jsonToQueryString(auth.credentials()),
						token: auth.credentials().token,
						version: "1.0",
						qoslevel: 0,
					},
				},
			],
		})
		ws.send(JSON.stringify({
			requests: [
				{
					service: "ADMIN",
					command: "LOGIN",
					requestId: requestId(),
					account: auth.accountId(),
					source: auth.appId(),
					parameters: {
						credential: jsonToQueryString(auth.credentials()),
						token: auth.credentials().token,
						version: "1.0",
						qoslevel: 0,
					},
				},
			],
		}));
	};

	ws.onmessage = function (message) {
		//console.log(message)
		if (message.data.charAt(0) === "{" && message.data.charAt(message.data.length - 1) === "}") {
			packetPiece = "";
		} else if ((message.data.charAt(0) === "{" && message.data.charAt(message.data.length - 1) !== "}") || message.data.charAt(0) !== "{" && message.data.charAt(message.data.length - 1) !== "}") {
			packetPiece += message.data;
		} else if (message.data.charAt(0) !== "{" && message.data.charAt(message.data.length - 1) === "}") {
			message.data = packetPiece + message.data;
		}

		message.data = message.data.replace(` "C" `, ` -C- `);
		message.data = message.data.replace(` "C" `, ` -C- `);
		message.data = message.data.replace(` "C" `, ` -C- `);

		try {
			let packet = JSON.parse(message.data)
			//console.log(packet) 
			packetcount()
			let datacount = 0
			

			if (packet.notify) {
				packet.notify.map(p => {
					module.exports.event.emit("notify", p);
					//console.log("\x1b[36m%s\x1b[0m", moment.unix(p.heartbeat/1000).format("LTS") + ` [${"Heartbeat".padEnd(16, " ")}] :: heartbeat: ${moment.unix(packet.notify[0].heartbeat/1000).format("LLLL")}`);
				})
			} else {
				if (packet.data) {
					packet.data.map((m) => {
						datacount = m.content.length
						m.content.map(e => {
							msgcount()
							if (JSON.stringify(m.service) == "NEWS_HEADLINE") {
								console.log(`\x1b[41m ${m.service} [${e.key}] : ${JSON.stringify(e)} \x1b[0m`);
							} else {
								//console.log(`${m.service} [${e.key}] : ${JSON.stringify(e)}`);
							}
						})
						socketData(m)
					})
				}

				if (packet.response) {
					packet.response.map((m) => {
						
						switch (m.service) {
							case "ADMIN":
								if (m.content.code === 0) {
									socketStatus("connected")
									console.log(moment(Date.now()).format() + `: Login Sucuess! [code: ${m.content.code} packet:${m.content.packet}`, "\007");
									initStream()
								} else {
									socketStatus(`FAILED [code: ${m.content.code} packet:${m.content.packet}`, "\007");
								}
								break;
							default:
								recHistory.push(m)
								if (m.content.code === 0) {
									console.log(`[${moment(Date.now()).format()}] ${m.service} \x1b[92m OK `);
								} else {
									console.log(`\x1b[44m [${moment(Date.now()).format()}] \x1b[0m  \x1b[44m [${m.requestId}] \x1b[0m  ${m.service}  \x1b[41m Fail  \x1b[0m ${m.content.msg}`,m)
									console.log("\007");
								}
							break;
						}
					});
				}
			}
		} catch (error) {
			console.log("\x1b[41m", error);
			console.log("\x1b[0m");
		}

		//setState({ packetcount: state.packetcount += 1 })
		//console.log(event)
	};

	ws.onerror = function (error) {
		console.log(error);
		socketStatus("ERROR")
	};

	ws.onclose = function (error) {
		socketStatus("disconnected")
		console.log(moment(Date.now()).format() + ": echo-protocol Connection Closed");
		console.log(error);
		//debugger
		setTimeout(module.exports.load, 10000)
	};
	
}


function sendMsg(c){
	sendQueue.push(c);
};




function initStream() {
	module.exports.sendServiceMsg("ACTIVES_NASDAQ", ["NASDAQ-60", "NASDAQ-300", "NASDAQ-600", "NASDAQ-1800", "NASDAQ-3600", "NASDAQ-ALL"]);
	module.exports.sendServiceMsg("ACTIVES_OTCBB", ["OTCBB-60", "OTCBB-300", "OTCBB-600", "OTCBB-1800", "OTCBB-3600", "OTCBB-ALL"]);
	module.exports.sendServiceMsg("ACTIVES_NYSE", ["NYSE-60", "NYSE-300", "NYSE-600", "NYSE-1800", "NYSE-3600", "NYSE-ALL"]);
	module.exports.sendServiceMsg("ACTIVES_OPTIONS", ["OPTS-DESC-60", "OPTS-DESC-300", "OPTS-DESC-600", "OPTS-DESC-1800", "OPTS-DESC-3600", "OPTS-DESC-ALL"]);
	
	//console.log(monitor.defaultStocks);
	//module.exports.sendServiceMsg("equities", [...monitor.defaultStocks, ...monitor.equities(), ...monitor.indexes()]);
	module.exports.event.emit("monitorAddItems", [...defaultFutures.map(future => { return new Product(future) })] )
}




module.exports.sendServiceMsg = (_type, _keys, _callback = null) => {
	//console.log(_type);
	console.log(_type,[..._keys].toString());
	switch (_type) {
		case "equities":
		case "indexes":
			console.log(moment(Date.now()).format() + `: Subscribing to ${_keys.length} ${_type}`);
			sendMsg({
				requests: [
					{
						service: "QUOTE",
						requestId: requestId(),
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
						requestId: requestId(),
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
						requestId: requestId(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4",
						},
					},
					{
						service: "NEWS_HEADLINE",
						requestId: requestId(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							//keys: [..._keys].slice(0, 100).toString(),
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4,5,6,7,8,9,10",
						},
					},
					// {
					// 	service: "NEWS_HEADLINELIST",
					// 	requestId: requestId(),
					// 	command: "SUBS",
					// 	account: auth.accountId(),
					// 	source: auth.appId(),
					// 	parameters: {
					// 		keys: [..._keys].slice(0, 100).toString(),
					// 		fields: "0,1,2,3,4,5,6,7,8,9,10",
					// 	},
					// },
					// {
					// 	service: "NEWS_STORY",
					// 	requestId: requestId(),
					// 	command: "SUBS",
					// 	account: auth.accountId(),
					// 	source: auth.appId(),
					// 	parameters: {
					// 		keys: [..._keys].slice(0, 100).toString(),
					// 		fields: "0,1,2,3,4,5,6,7,8,9,10",
					// 	},
					// },
				],
			});
			break;
		case "futures":
			console.log(moment(Date.now()).format() + `: Subscribing to ${_keys.length} futures `);
			sendMsg({
				requests: [
					{
						service: "CHART_FUTURES",
						requestId: requestId(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4,5,6,7",
						},
					},{
						service: "LEVELONE_FUTURES",
						requestId: requestId(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1,2,3,4,8,9,12,13,14,16,18,19,20,23,24,25,26,27,28,31",
						},
					// },{
					// 	service: "FUTURES_BOOK",
					// 	requestId: requestId(),
					// 	command: "SUBS",
					// 	account: auth.accountId(),
					// 	source: auth.appId(),
					// 	parameters: {
					// 		keys: [..._keys].toString(),
					// 		fields: "0,1,2,3,4,8,9,12,13,14,16,18,19,20,23,24,25,26,27,28,31",
					// 	},
					},{
						service: "TIMESALE_FUTURES",
						requestId: requestId(),
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
						requestId: requestId(),
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
		case "ACTIVES_OTCBB":
		case "ACTIVES_NYSE":
		case "ACTIVES_NASDAQ":
		case "ACTIVES_OPTIONS":
			sendMsg({
				requests: [
					{
						service: _type,
						requestId: requestId(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1",
						},
					},
				],
			});
			break;
		case "getFutureChart":
			let callbackId = requestId();
			sendMsg({
				requests: [
					{
						service: _type,
						requestId: callbackId,
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: [..._keys].toString(),
							fields: "0,1",
						},
					},
				],
			});

			callbacks[callbackId] = _callback
			break;
		default:
			debugger

	}
}



setInterval(() => {
	if (_socketStatus === "connected" && sendQueue.length > 0) {
		console.log(moment(Date.now()).format() + `: Send to TDA:`, sendQueue[0]);
		sendHistory.push(sendQueue[0]);
		ws.send(JSON.stringify(sendQueue.shift()));
	}
}
, 200);


jsonToQueryString = (json) => { return Object.keys(json).map(function (key) { return (encodeURIComponent(key) + "=" + encodeURIComponent(json[key])); }).join("&"); };
