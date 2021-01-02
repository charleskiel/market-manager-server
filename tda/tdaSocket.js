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

let _requestid = 0; function requestid(){return _requestid += +1;};
let _socketStatus = "disconnected";

let sendQueue = []
let sendHistory = [] 
let recHistory = []
let callbacks = []

function socketStatus(_status) {
	_socketStatus = _status
	module.exports.event.emit("socketStatus", _status);
}

// let status = {
// 	socketStatus: _socketStatus,
// 	sendhistory: sendHistory,
// 	rechistory: recHistory,
// 	requestid : _requestid,
// 	msgCount : _msgcount,
// 	packetCount : _packetcount,
// }

module.exports.load = () => {
	ws = new WebSocket("wss://streamer-ws.tdameritrade.com/ws", {
		maxReceivedFrameSize: 2231149 * 8
	});

	ws.onopen = function () {
		socketStatus("open")
		console.log(moment(Date.now()).format() + ": Connection opened");

		msg = {
			requests: [
				{
					service: "ADMIN",
					command: "LOGIN",
					requestid: requestid(),
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
		};
		//console.log(JSON.stringify(msg))
		ws.send(JSON.stringify(msg));
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
			//console.log(packet) 
			//if (message.data.includes(`""/`)) message.data = message.data.replace(`""`, `"`).replace(`""`, `"`);
			let packet = JSON.parse(message.data)
			module.exports.event.emit("dataCount" ,["socketDataReceived", message.data.length * 2])
			module.exports.event.emit("dataCount" ,["socketPacketCountReceived", 1])
			
			let datacount = 0
			

			if (packet.notify) {
				packet.notify.map(p => {
					module.exports.event.emit("notify", p);
					//console.log("\x1b[36m%s\x1b[0m", moment.unix(p.heartbeat/1000).format("LTS") + ` [${"Heartbeat".padEnd(16, " ")}] :: heartbeat: ${moment.unix(packet.notify[0].heartbeat/1000).format("LLLL")}`);
				})
			} else {
				if (packet.data) {
					//module.exports.event.emit("dataCount" ,["socketMessageCountReceived", packet.data.length]);
					packet.data.map((m) => {
						datacount = m.content.length
						m.content.map(e => {
							
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
					module.exports.event.emit("dataCount" ,["socketMessageCountReceived", 1]);
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
									console.log(`\x1b[44m [${moment(Date.now()).format()}] \x1b[0m  \x1b[44m [${m.requestid}] \x1b[0m  ${m.service}  \x1b[41m Fail  \x1b[0m ${m.content.msg}`,m)
									console.log("\007");
								}
							break;
						}
					});
				}
				if (packet.snapshot) {
					packet.snapshot[0].content.map((m) => {
						console.log(m)
					})
				}

			}
		} catch (error) {
			console.log("\x1b[41m", error);
			console.log("\x1b[0m");
		}
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
		setTimeout(module.exports.load, 5000)
	};
	
}


function sendMsg(c){
	sendQueue.push(c);
};




function initStream() {
	module.exports.sendServiceMessage("ACTIVES_NASDAQ", ["NASDAQ-60", "NASDAQ-300", "NASDAQ-600", "NASDAQ-1800", "NASDAQ-3600", "NASDAQ-ALL"]);
	module.exports.sendServiceMessage("ACTIVES_OTCBB", ["OTCBB-60", "OTCBB-300", "OTCBB-600", "OTCBB-1800", "OTCBB-3600", "OTCBB-ALL"]);
	module.exports.sendServiceMessage("ACTIVES_NYSE", ["NYSE-60", "NYSE-300", "NYSE-600", "NYSE-1800", "NYSE-3600", "NYSE-ALL"]);
	module.exports.sendServiceMessage("ACTIVES_OPTIONS", ["OPTS-DESC-60", "OPTS-DESC-300", "OPTS-DESC-600", "OPTS-DESC-1800", "OPTS-DESC-3600", "OPTS-DESC-ALL"]);
	
	//console.log(monitor.defaultStocks);
	//module.exports.sendServiceMessage("equities", [...monitor.defaultStocks, ...monitor.equities(), ...monitor.indexes()]);
	
	module.exports.event.emit("monitorAddItems", [...defaultFutures.map(future => { return new Product(future) })] )
}




module.exports.sendServiceMessage = (_type, _keys, _callback = null) =>{
	//console.log(_type);
	//console.log(_type,[..._keys].toString());
	switch (_type) {
		case "equities":
		case "indexes":
			console.log(moment(Date.now()).format() + `: Subscribing to ${_keys.length} ${_type}`);
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
						requestid: requestid(),
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
						requestid: requestid(),
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
					// 	requestid: requestid(),
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
					// 	requestid: requestid(),
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
		case "ACTIVES_OTCBB":
		case "ACTIVES_NYSE":
		case "ACTIVES_NASDAQ":
		case "ACTIVES_OPTIONS":
			sendMsg({
				requests: [
					{
						service: _type,
						requestid: requestid(),
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
		case "CHART_HISTORY_FUTURES":
			// let callbackId = requestid();
			// console.log(moment(moment().utcOffset("-05:00").startOf("day").unix()) * 1000);
			// console.log(moment(moment().utcOffset("-05:00").startOf("day").add(-30, "day").unix()) * 1000);		
			
			// sendMsg({
			// 	requests: [
			// 		{
			// 			service: _type,
			// 			requestid: callbackId,
			// 			command: "GET",
			// 			account: auth.accountId(),
			// 			source: auth.appId(),
			// 			parameters: {
			// 				keys: _keys,
			// 				END_TIME: moment(moment().utcOffset("-05:00").startOf("day").unix()) * 1000,
			// 				START_TIME: moment(moment().utcOffset("-05:00").startOf("day").add(-30 , "day").unix()) * 1000,
			// 				frequency: "m1"
			// 			},
			// 		},
			// 	],
			// });

			// callbacks[callbackId] = _callback;
			break;
		default:
			debugger;
	}
}



setInterval(() => {
	if (_socketStatus === "connected" && sendQueue.length > 0) {
		console.log(moment(Date.now()).format() + `: Send to TDA:`, sendQueue[0]);
		module.exports.event.emit("dataCount" ,["socketPacketCountSent", 1]);
		module.exports.event.emit("dataCount" ,["socketMessageCountSent", sendQueue[0].length]);
		module.exports.event.emit("dataCount" ,["socketDataSent", JSON.stringify(sendQueue[0]).length * 2]);

		sendHistory.push(sendQueue[0]);
		ws.send(JSON.stringify(sendQueue.shift()));
	}
}
, 200);


function jsonToQueryString(json){ return Object.keys(json).map(function (key) { return (encodeURIComponent(key) + "=" + encodeURIComponent(json[key])); }).join("&"); };
