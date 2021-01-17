const _ = require("lodash");
const mysql = require("./mysql.js");
const EventEmitter2 = require("eventemitter2");
const tda = require("./tda/tda.js")
const moment = require("moment");

//const { quote } = require("./alpaca/alpaca.js");

let event = new EventEmitter2({
		wildcard: true,
		delimiter: ".",
		newListener: false,
		removeListener: false,
		verboseMemoryLeak: false,
		ignoreErrors: false,
});

let cryptos = []

function cryptoTick(data) {
	if (!cryptos[data.product_id] && data.product_id) {
		cryptos[data.product_id] = new Crypto(data.product_id)
	};

	switch (data.type) {
		case "ticker":
			cryptos[data.product_id].ticker(data)
			break;
		case "heartbeat":
			//cryptos[data.product_id].ticker(data)
			//console.log(data)
			break;
		case "received":   //l2
		case "open":   //l2
		case "done":   //l2
		case "cancelled":   //l2
		case "match":   //l2
		case "change":   //l2
			cryptos[data.product_id].l2(data)
			break;
		case "subscriptions":
			break;
		case "snapshot":
			console.log(data)
			break;
		default:
			console.log(data)
			break;
	}
}



class Crypto {
	event = new EventEmitter2({
		wildcard: true,
		delimiter: ".",
		newListener: false,
		removeListener: false,
		verboseMemoryLeak: false,
		ignoreErrors: false,
	});

	sequence = 0
	open24h = 0
	volume24h = 0
	low24h = 0
	high24h = 0
	volume30d = 0
	side = ""
	tradeId = 0 
	key = "";
	type = "";
	Bid = 0; //1
	Ask = 0; //2
	last = 0; //3
	BidSize = 0; //4
	AskSize = 0; //5
	TotalVolume = 0; //8
	LastSize = 0; //9
	lastTradeTime = 0; //10
	QuoteTime = 0; //11
	High = 0; //12
	Low = 0; //13
	BidTick = ""; //14
	Close = 0; //15
	Volatility = 0; //22
	Description = ""; //25
	LastID = ""; //26
	Digits = 0; //27
	Open = 0; //28
	NetChange = 0; //29
	YearHigh = 0; //30
	YearLow = 0; //31
	ExchangeName = ""; //39
	Mark = 0; //49
	QuoteTime = 0; //50
	
	bar = {h:0,
		"l":0,
		"o":0,
		"v":0,
		"t": 0,
		"buys": 0,
		"buysSize": 0,
		"sells": 0,
		"sellsSize": 0,
		"bestBid": 0,
		"bestAsk": 0,
		"ticks": 0,
		"key": ""
	}

	l2Bars1m = []
	l2Bars1s = []

	todo = { start: 0, end: 0, range: 0, done: true };

	constructor(key) {
		console.log("creating " + key)
		this.key = key;
	}

	ticker = (data) => {
		//console.log(moment(this.lastTradeTime).unix())
		//console.log(moment(this.lastTradeTime).startOf("minute").unix())
		//console.log(moment(data.time).unix())
		//console.log(moment(data.time).startOf("minute").unix())

		data = {
			"key": data.product_id,
			"time": moment(data.time).unix() * 1000,
			"side" : data.side,
			"lastSize": Number(data.last_size),
			"price": Number(data.price),
			"bestBid": Number(data.best_bid),
			"bestAsk": Number(data.best_ask),
			"tradeId": data.trade_id,
			"volume24h": Number(data.volume_24h),
			"volume30d": Number(data.volume_30d),
			"open24h": Number(data.open_24h),
			"high24h": Number(data.high_24h),
			"low24h": Number(data.low_24h),
		}
		this.event.emit("ticker", data)

		if (moment(data.time).startOf("minute").unix() > moment(this.lastTradeTime).startOf("minute").unix() && Number(this.lastTradeTime) > 0) {
			let avgBid = 0
			let avgAsk = 0
			if (this.bar.ticks > 0) {
				avgBid = this.bar.bestBid / this.bar.ticks
				avgAsk = this.bar.bestAsk / this.bar.ticks
			}
			mysql.query(`INSERT INTO crypto (symbol,\`timestamp\`,h,l,o,c,v,buys,buysSize,sells,sellsSize,avgbid,avgAsk)
			VALUES ('${this.key}', ${moment(this.lastTradeTime).startOf("minute").unix() * 1000}, ${this.bar.h}, ${this.bar.l}, ${this.bar.o}, ${data.price}, ${this.bar.v}, ${this.bar.buys}, ${this.bar.buysSize}, ${this.bar.sells}, ${this.bar.sellsSize}, ${avgBid}, ${avgAsk})
			ON DUPLICATE KEY UPDATE  o = ${this.bar.o}, h = ${this.bar.h}, l = ${this.bar.l}, c = ${data.price}, v = ${this.bar.v}, buys = ${this.bar.buys}, buysSize = ${this.bar.buysSize}, sells = ${this.bar.sells}, sellsSize = ${this.bar.sellsSize}, avgBid = ${avgBid}, avgAsk = ${avgAsk};`)			
			this.lastTradeTime = moment(data.time).unix() * 1000
			this.bar = {
				"key": this.key,
				"h":data.price,
				"l":data.price,
				"o":data.price,
				"t": moment(data.time).startOf("minute").unix() * 1000,
				"v": data.lastSize,
				"buys": (data.side == "buy" ? 1 : 0),
				"buysSize": (data.side == "buy" ? data.lastSize : 0),
				"sells"	: (data.side == "sell" ? 1 : 0),
				"sellsSize": (data.side == "sell" ? data.lastSize : 0),
				"bestBid": data.bestBid,
				"bestAsk": data.bestAsk,
				"ticks" : 0,
			}
		this.event.emit("chartData", data)

		} else {
			this.bar.ticks += 1

			if (this.bar.h == 0) this.bar.h = data.price
			if (this.bar.l == 0) this.bar.l = data.price
			if (this.bar.o == 0) this.bar.o = data.price
			if (data.price > this.bar.h) this.bar.h = data.price
			if (data.price < this.bar.l) this.bar.l = data.price
			this.bar.v += data.lastSize
			this.lastTradeTime = moment(data.time).unix() * 1000

			if (data.side == "buy") {
				this.bar.buys += 1,
				this.bar.buysSize  += data.lastSize 
			}else if (data.side == "sell") {
				this.bar.sells += 1,
				this.bar.sellsSize  += data.lastSize
			}
			this.bar.bestBid  += data.bestBid
			this.bar.bestAsk  += data.bestAsk
					
			//if (this.key = "BTC-USD") console.log(JSON.stringify(this.bar))
		}

		this.sequence = data.sequence
		this.LastPrice = data.price
		this.open24h = data.open24h
		this.volume24h = data.volume24h
		this.low24h = data.low24h
		this.high24h = data.high24h
		this.volume30d = data.volume30d
		this.Bid = data.bestBid
		this.Ask = data.bestAsk
		this.side = data.side
		this.tradeId = data.tradeId
		this.LastSize = data.lastSize
	};

	l2 = (data) => {
		
		//let l2Bar = {timestamp: 0,buy: {"open": 0,"canceled": 0,"match": 0,"changed": 0,},sell: {"open": 0,"canceled": 0,"match": 0,"changed": 0,}}

		data.time = Number(moment(data.time).format('x'))
		if (this.l2Bars1s.length == 0) {
			this.l2Bars1s.push({timestamp: Number(moment(data.time).startOf("second").format('x')),buy: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0},sell: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0}})
		}
		if (this.l2Bars1m.length == 0) {
			this.l2Bars1m.push({timestamp: Number(moment(data.time).startOf("minute").format('x')),buy: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0},sell: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0}})
		}
		
		if (this.l2Bars1s[this.l2Bars1s.length - 1].timestamp + 1000 < data.time) {
			this.l2Bars1s.push({timestamp: Number(moment(data.time).startOf("second").format('x')) ,buy: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0},sell: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0}})
		}
		this.l2Bars1s[this.l2Bars1s.length - 1][data.side][data.type] += 1
		
		if (this.l2Bars1m[this.l2Bars1m.length - 1].timestamp + 60000 < data.time) {
			this.l2Bars1m.push({timestamp: Number(moment(data.time).startOf("minute").format('x')) ,buy: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0},sell: {"open": 0,"canceled": 0,"match": 0,"changed": 0,"Rx" : 0, "done" : 0}})
		}
		this.l2Bars1m[this.l2Bars1m.length - 1][data.side][data.type] += 1

		if (this.l2Bars1s.length > 60) {this.l2Bars1s.shift()}
		if (this.l2Bars1m.length > 60) {this.l2Bars1m.shift()}

		return 
	}

	getChartHistory = () => {
		tda.getData.priceHistory(this.key)
		.then((data) => {
			if (data.candles.length > 0) {
				this.todo.done = true;
				data.candles.forEach((candle) => {
					this.addChartData({ timestamp: candle.datetime * 1000, o: candle.open, h: candle.high, l: candle.low, c: candle.close, v: candle.volume }, false);
				});
				console.log(data.candles.length + " items for " + key + " done! ");
			}
		})
		.catch((error) => {
			console.log(error);
			return false;
		});
	}
	

	addChartData = (data, emit = true) => {
		if (data.v < 0) data.v = 0;
		if (this.type != "future") {
			mysql.query(`insert into \`CHART_EQUITY\` (\`key\`,\`timestamp\`,o,h,l,c,v) VALUES ('${this.key}', ${data.timestamp}, ${data.o}, ${data.h}, ${data.l}, ${data.c}, ${data.v}) ON DUPLICATE KEY UPDATE  o = ${data.o}, h = ${data.h}, l = ${data.l}, c = ${data.c}, v = ${data.v}`);
		} else {
			mysql.query(`insert into \`CHART_FUTURES\` (\`key\`,\`timestamp\`,o,h,l,c,v) VALUES ('${this.key}', ${data.timestamp}, ${data.o}, ${data.h}, ${data.l}, ${data.c}, ${data.v}) ON DUPLICATE KEY UPDATE  o = ${data.o}, h = ${data.h}, l = ${data.l}, c = ${data.c}, v = ${data.v}`);
		}
		if (emit) this.event.emit("chart", data);
	};
}
	

module.exports = {
	Crypto: Crypto,
	cryptos : cryptos,
	event: event,
	cryptoTick : cryptoTick
}