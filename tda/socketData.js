
const socket = require("./tdaSocket.js")

module.exports.tdaData = (msg) => {

	if (msg.content) {
		if (msg.content.code == 17) {
			//console.log(`\x1b[35m ${msg.service} [${msg.code}] :: ${msg.content.msg}`);
		} else {
			//socket.event.emit("dataCount", ["socketMessageCountRx", msg.content.length]);

			msg.service = msg.service.toUpperCase();
			switch (msg.service) {
				case "CHART_EQUITY":
					msg.content.map((_content) => {
						socket.event.emit(msg.service, {dataType: msg.service, key: _content.key, timestamp: _content["7"], h: _content["2"], l: _content["3"], o: _content["1"], c: _content["4"], v: _content["5"] });
					});
					break;
				case "CHART_FUTURES":
					msg.content.map((_content) => {
						socket.event.emit(msg.service, {dataType: msg.service, key: _content.key, timestamp: _content["1"], h: _content["3"], l: _content["4"], o: _content["2"], c: _content["5"], v: _content["6"] });
					});
					break;
				case "CHART_HISTORY_FUTURES":
					msg.content.map((_content) => {
						socket.event.emit(msg.service, {dataType: msg.service, key: _content.key, timestamp: _content["1"], h: _content["3"], l: _content["4"], o: _content["2"], c: _content["5"], v: _content["6"] });
					});
					break;
				case "NEWS_HEADLINE":
					msg.content.map((_content) => {});
					//debugger;
					break;
				case "ACTIVES_NASDAQ":
				case "ACTIVES_NYSE":
				case "ACTIVES_OTCBB":
				case "ACTIVES_OPTIONS":
				case "QUOTE":
				case "LEVELONE_FUTURES":
				case "TIMESALE_FUTURES":
				case "TIMESALE_EQUITY":
					msg.content.map((_content) => {socket.event.emit(msg.service, _content)});
					break;
				case "SERVICE":
					console.log(msg.service + ": " + msg.content);
					console.log(moment(Date.now()).format() + `: Default Message`, msg);
					break;
				default:
					console.log(msg.service + ": " + msg.content);
					console.log(moment(Date.now()).format() + `: Default Message`, msg);
					break;
			}
		}
	}
}