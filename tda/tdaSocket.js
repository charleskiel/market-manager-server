const WebSocket = require("websocket").w3cwebsocket;
var auth = require("./auth")
var monitor = require("./monitor")
var watchlists = require("./watchlists")
var ws = WebSocket
const moment = require("moment");

var EventEmitter2 = require("eventemitter2");


module.exports.event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	//maxListeners: 10,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});

let _requestid = 0; function requestid(){return _requestid += +1;};
let _msgcount = 0; function msgcount(){return _msgcount += +1;};
let _packetcount = 0; function packetcount(){return _packetcount += +1;};
let _socketStatus = "disconnected";

let sendQueue = []
let sendHistory = [] 
let recHistory = [] 
function socketStatus(_status) {
	_socketStatus = _status
	module.exports.event.emit("socketStatus" , _status)
}

module.exports.status = {
	socketStatus: _socketStatus,
	sendhistory: sendHistory,
	rechistory: recHistory,
	requestid : _requestid,
	msgcount : _msgcount,
	packetcount : _packetcount,
}

module.exports.load = () => {
	ws = new WebSocket("wss://streamer-ws.tdameritrade.com/ws");

	ws.onopen = function () {
		socketStatus("open")
		console.log(moment(Date.now()).format() + ": Connection opened");
		ws.send(JSON.stringify({
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
			

			if (packet.notify) {
				packet.notify.map(p => {
					module.exports.event.emit("notify", p);
					console.log("\x1b[36m%s\x1b[0m", moment.unix(p.heartbeat).format("LTS") + ` [${"Heartbeat".padEnd(16, " ")}] :: heartbeat: ${moment.unix(packet.notify[0].heartbeat).format("LLLL")}`);
				})
				//console.log("\x1b[36m%s\x1b[0m", moment.unix(packet.notify[0].heartbeat).format("LTS") + ` [${"Heartbeat".padEnd(16, " ")}] :: heartbeat: ${moment.unix(packet.notify[0].heartbeat).format("LLLL")}`);
				//console.log(moment(Date.now()).format("LTS") + `: heartbeat: ${moment.unix(packet.notify[0].heartbeat).format("LLLL")}`)
				//console.log(moment(Date.now()).format() + packet)
			} else {
				
				if (packet.data) {
					packet.data.forEach((m) => {
						msgcount()
						module.exports.event.emit(m.service, m)
					})
				}

				if (packet.response) {
					packet.response.forEach((m) => {
						
						switch (m.service) {
							case "ADMIN":
								if (m.content.code === 0) {
									socketStatus("connected")
									console.log(moment(Date.now()).format() + `: Login Sucuess! [code: ${m.content.code} packet:${m.content.packet}`);
									initStream()
								} else {
									socketStatus(`FAILED [code: ${m.content.code} packet:${m.content.packet}`);
								}
								break;
							
							
							default:
								recHistory.push(m)
								if (m.content.code === 0) {
									console.log(`[${moment(Date.now()).format()}] ${m.service} \x1b[92m OK `);
								} else {
									console.log(`\x1b[44m [${moment(Date.now()).format()}] \x1b[0m  \x1b[44m [${m.requestid}] \x1b[0m  ${m.service}  \x1b[41m Fail  \x1b[0m ${m.content.msg}`,m)
									
									// for (let index = 0; index < sendHistory.length; index++) {
									// 	console.log(sendHistory[index])
										
									// }

									//debugger
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
	// sendMsg({
	// 	requests: [{
	// 		service: "QUOTE",
	// 		requestid: requestid(),
	// 		command: "SUBS",
	// 		account: auth.accountId(),
	// 		source: auth.appId(),
	// 		parameters: {
	// 			keys: [..._keys].toString(),
	// 			fields: "0,1,2,3,8,9,10,11,12,13,14,15,16,17,18,24,25,28,29,30,31,40,49",
	// 		},
	// 	}]
	// })
	module.exports.sendServiceMsg("ACTIVES_NASDAQ", ["NASDAQ-60", "NASDAQ-300", "NASDAQ-600", "NASDAQ-1800", "NASDAQ-3600", "NASDAQ-ALL"]);
	module.exports.sendServiceMsg("ACTIVES_OTCBB", ["OTCBB-60", "OTCBB-300", "OTCBB-600", "OTCBB-1800", "OTCBB-3600", "OTCBB-ALL"]);
	module.exports.sendServiceMsg("ACTIVES_NYSE", ["NYSE-60", "NYSE-300", "NYSE-600", "NYSE-1800", "NYSE-3600", "NYSE-ALL"]);
	module.exports.sendServiceMsg("ACTIVES_OPTIONS", ["OPTS-DESC-60", "OPTS-DESC-300", "OPTS-DESC-600", "OPTS-DESC-1800", "OPTS-DESC-3600", "OPTS-DESC-ALL"]);
	
	console.log(monitor.defaultStocks);
	//module.exports.sendServiceMsg("equities", [...monitor.defaultStocks, ...monitor.equities(), ...monitor.indexes()]);
	monitor.add(monitor.defaultFutures);

	// sendMsg({
	//     requests: [
	//         {
	//             service: "ADMIN",
	//             requestid: requestid(),
	//             command: "SUBS",
	//             account: auth.accountId(),
	//             source: principals      .streamerInfo.appId,
	//             parameters: {"qoslevel": "5"},
	//         },
	//     ],
	// });
}




module.exports.sendServiceMsg = (_type, _keys) => {
	console.log(_type);
	console.log([..._keys].toString());
	switch (_type) {
		case "equities":
		case "indexes":
			console.log(moment(Date.now()).format() + `: Subscribing to ${monitor.equities().length} stocks `);
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
					{
						service: "NEWS_HEADLINE",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: "*ALL*", //keys: _keys,
							fields: "0,1,2,3,4,5,6,7,8,9,10",
						},
					},
					{
						service: "NEWS_HEADLINELIST",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: "*ALL*", //keys: _keys,
							fields: "0,1,2,3,4,5,6,7,8,9,10",
						},
					},
					{
						service: "NEWS_STORY",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: "*ALL*", //keys: _keys,
							fields: "0,1,2,3,4,5,6,7,8,9,10",
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
							keys: monitor.futures().toString(),
							fields: "0,1,2,3,4,5,6,7",
						},
					},{
						service: "LEVELONE_FUTURES",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: monitor.futures().toString(),
							fields: "0,1,2,3,4,8,9,12,13,14,16,18,19,20,23,24,25,26,27,28,31",
						},
					},{
						service: "TIMESALE_FUTURES",
						requestid: requestid(),
						command: "SUBS",
						account: auth.accountId(),
						source: auth.appId(),
						parameters: {
							keys: monitor.futures().toString(),
							fields: "0,1,2,3,4",
						},
					},
				],
			});

			break;
		case "options":

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
