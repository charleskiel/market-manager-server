const _ = require("lodash");
const mysql = require("./mysql.js");
const EventEmitter2 = require("eventemitter2");
const tda = require("./tda/tda.js")
//const { quote } = require("./alpaca/alpaca.js");

let event = new EventEmitter2({
		wildcard: true,
		delimiter: ".",
		newListener: false,
		removeListener: false,
		verboseMemoryLeak: false,
		ignoreErrors: false,
});



class Product {

	key = "";
	type = "";
	Bid = 0; //1
	Ask = 0; //2
	last = 0; //3
	BidSize = 0; //4
	AskSize = 0; //5
	AskID = ""; //6
	BidID = ""; //7
	TotalVolume = 0; //8
	LastSize = 0; //9
	TradeTime = 0; //10
	QuoteTime = 0; //11
	High = 0; //12
	Low = 0; //13
	BidTick = ""; //14
	Close = 0; //15
	ExchangeID = ""; //16 DB NYSE = n AMEX = a NASDAQ = q OTCBB = u PACIFIC= p INDICES = x AMEX_INDEX = g MUTUAL_FUND = m PINK_SHEET = 9
	Marginable = true; //17
	Shortable = true; //18
	Volatility = 0; //22
	Description = ""; //25
	LastID = ""; //26
	Digits = 0; //27
	Open = 0; //28
	NetChange = 0; //29
	YearHigh = 0; //30
	YearLow = 0; //31
	PERatio = 0; //32
	DividendAmount = 0; //33
	ExchangeName = ""; //39
	RegularMarketQuote = true; //41
	RegularMarketTrade = true; //42
	RegularMarketLastPrice = 0; //43
	RegularMarketLastSize = 0; //44
	RegularMarketTradeTime = 0; //45
	RegularMarketTradeDay = 0; //46
	RegularMarketNetChange = 0; //47
	SecurityStatus = ""; //48
	Mark = 0; //49
	QuoteTime = 0; //50
	TradeTime = 0; //51
	RegularMarketTradeTime = 0; //52

	todo = { start: 0, end: 0, range: 0, done: true };

	constructor(key) {
		this.key = key;
		this.type = isType(key);
	}

	tdaQuote = (data) => {
		//console.log(this)
		let self = this;
		_(data).forEach(function (v, k) {
			switch (k) {
				case "1": self.Bid = v; break;
				case "2": self.Ask = v; break;
				case "3": self.LastPrice = v; break;
				case "4": self.BidSize = v; break;
				case "5": self.AskSize = v; break;
				case "6": self.AskID = v; break;
				case "7": self.BidID = v; break;
				case "8": self.TotalVolume = v; break;
				case "9": self.LastSize = v; break;
				case "10": self.TradeTime = v; break;
				case "11": self.QuoteTime = v; break;
				case "12": self.High = v; break;
				case "13": self.Low = v; break;
				case "14": self.BidTick = v; break;
				case "15": self.Close = v; break;
				case "16": self.ExchangeID = v; break;
				case "17": self.Marginable = v; break;
				case "18": self.Shortable = v; break;
				case "22": self.Volatility = v; break;
				case "25": self.Description = v; break;
				case "26": self.LastID = v; break;
				case "27": self.Digits = v; break;
				case "28": self.Open = v; break;
				case "29": self.NetChange = v; break;
				case "30": self.YearHigh = v; break;
				case "31": self.YearLow = v; break;
				case "32": self.PERatio = v; break;
				case "33": self.DividendAmount = v; break;
				case "39": self.ExchangeName = v; break;
				case "41": self.RegularMarketQuote = v; break;
				case "42": self.RegularMarketTrade = v; break;
				case "43": self.RegularMarketLastPrice = v; break;
				case "44": self.RegularMarketLastSize = v; break;
				case "45": self.RegularMarketTradeTime = v; break;
				case "46": self.RegularMarketTradeDay = v; break;
				case "47": self.RegularMarketNetChange = v; break;
				case "48": self.SecurityStatus = v; break;
				case "49": self.Mark = v; break;
				case "50": self.QuoteTime = v; break;
				case "51": self.TradeTime = v; break;
				case "52": self.RegularMarketTradeTime = v; break;
			}
		});
		event.emit("quote", data)
	};

	tdaFuturesQuote = (data) => {
		return
	}
	tdaTimesale = (data) => {
		let self = this;
		_(data).forEach(function (v, k) {
			switch (k) {
				case "1": self.TradeTime = v; break;
				case "2": self.LastPrice = v; break;
				case "3": self.LastSize = v; break;
			}
		});
		event.emit("timeSale", data);
	};

	getChartHistory = () => {
		if (this.type != "future") {
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
		else if (this.type == "future") {
			tda.socket.sendServiceMessage("CHART_HISTORY_FUTURES", this.key);
		}
	
	}
	

	addChartData = (data, emit = true) => {
		if (data.v < 0) data.v = 0;
		if (this.type != "future") {
			mysql.query(`insert into \`CHART_EQUITY\` (\`key\`,\`timestamp\`,o,h,l,c,v) VALUES ('${this.key}', ${data.timestamp}, ${data.o}, ${data.h}, ${data.l}, ${data.c}, ${data.v}) ON DUPLICATE KEY UPDATE  o = ${data.o}, h = ${data.h}, l = ${data.l}, c = ${data.c}, v = ${data.v}`);
		} else {
			mysql.query(`insert into \`CHART_FUTURES\` (\`key\`,\`timestamp\`,o,h,l,c,v) VALUES ('${this.key}', ${data.timestamp}, ${data.o}, ${data.h}, ${data.l}, ${data.c}, ${data.v}) ON DUPLICATE KEY UPDATE  o = ${data.o}, h = ${data.h}, l = ${data.l}, c = ${data.c}, v = ${data.v}`);
		}
		if (emit) event.emit("chart", data);
	};
}
	

function isType(key) {
	try {
		if (!key.includes("$") && !key.includes("/") && key.length < 6) return "equity";
		if (key.includes("$") && !key.includes("/")) return "index";
		if (!key.includes("$") && key.includes("/")) return "future";
		if (!key.includes("$") && !key.includes("/") && key.length > 5) return "option";
		if (key.includes("-") && key.length > 5) return "crypto";
		
	} catch (error) {
		console.log(error)
		debugger;
	}
}


module.exports = {
	Product: Product,
	event : event
}