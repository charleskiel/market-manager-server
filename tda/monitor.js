const _ = require("lodash");
const moment = require("moment");

const mysql = require("../mysql.js");
const tdaSocket = require("./tdaSocket");

products = []

module.exports.actives = {
	add: function (msg){
		//'4896;0;1:21:00;01:21:36;2;0:10:5341501:TSLA_121120C650:TSLA Dec 11 2020 650 Call:30439:0.57:TSLA_121120C700:TSLA Dec 11 2020 700 Call:24301:0.45:AAPL_121120C125:AAPL Dec 11 2020 125 Call:18369:0.34:TSLA_121120C630:TSLA Dec 11 2020 630 Call:16585:0.31:PLTR_121120C30:PLTR Dec 11 2020 30 Call:15938:0.3:TSLA_121120C640:TSLA Dec 11 2020 640 Call:15661:0.29:SPY_120720C369:SPY Dec 7 2020 369 Call:11761:0.22:SPY_120720P368:SPY Dec 7 2020 368 Put:11515:0.22:BA_121120C250:BA Dec 11 2020 250 Call:11137:0.…P368:SPY Dec 7 2020 368 Put:174854:0.55:SPY_120720C369:SPY Dec 7 2020 369 Call:146119:0.46:AAPL_121120C125:AAPL Dec 11 2020 125 Call:129594:0.4:SPY_120720P369:SPY Dec 7 2020 369 Put:116933:0.36:TSLA_121120C650:TSLA Dec 11 2020 650 Call:90102:0.28:SPY_120720C370:SPY Dec 7 2020 370 Call:87910:0.27:PLTR_121120C30:PLTR Dec 11 2020 30 Call:82489:0.26:TSLA_121120C700:TSLA Dec 11 2020 700 Call:70707:0.22:VIX_121620P19:VIX Dec 16 2020 19 Put:61588:0.19:SPY_120920C370:SPY Dec 9 2020 370 Call:57718:0.18'
		let items = []
		switch (msg.service) {
				
			case "ACTIVES_NASDAQ": case "ACTIVES_NYSE": case "ACTIVES_OTCBB":
				var split = msg.content[0]["1"].split(";")
				if (split.length > 1) {
				var o = {
					"timestamp": msg.timestamp,
					"ID:": split[0],
					"sampleDuration": split[1],
					"Start Time": split[2],
					"Display Time": split[3],
					"GroupNumber": split[4],
					"groups": []
				}
				split = (split[6].split(":"))
				o.totalVolume = (split[0])
				o.groupcount = split[1]
				for (let i = 3; i < split.length; i += 3) {
					if (!products[split[i]]) {items.push(split[i]);}
					o.groups.push({ symbol: split[i], volume: split[i + 1], priceChange: split[i + 2] })
				}
				
				module.exports.actives[msg.service][o.sampleDuration] = o;

				}
				break;
			case "ACTIVES_OPTIONS":
				
				//console.log(moment(Date.now()).format() + ": OPTIONS Activies")
				//console.log(m)
				//debugger
				msg.content.map(act => {

				var split = act["1"].split(";")
				if (split[1]) {
					var o = {
						"timestamp": msg.timestamp,
						"ID:": split[0],
						"sampleDuration": split[1],
						"Start Time": split[2],
						"Display Time": split[3],
						"GroupNumber": split[4],
						"groups": []
					}

					split = (split[6].split(":"))
					o.totalVolume = (split[3])
					o.groupcount = split[1]
					//o.sampleDuration
					for (let i = 3; i < split.length; i += 4) {
						if (!products[split[i]]) {items.push(split[i]);}
						o.groups.push({ symbol: split[i], name: split[i + 1], volume: split[i + 2], percentChange: split[i + 3] })
					}

					//console.log(moment(Date.now()).format() + `: Default Message: ` + msg.service, m);
					//console.log(moment(Date.now()).format() + m);
					module.exports.actives.ACTIVES_OPTIONS[o.sampleDuration] = o;
				}
				})
		}

		if (items.length > 0) {
			module.exports.add(items)
			console.log(msg.service)
			console.log(module.exports.actives[msg.service])
		}
	},
	"ACTIVES_NASDAQ": {},
	"ACTIVES_NYSE": {},
	"ACTIVES_OTCBB": {},
	"ACTIVES_OPTIONS": {}
};
module.exports.defaultFutures = [
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

module.exports.list = () => {return products}

module.exports.equities = () => {
	return _.keys(products).filter(key => {
		return (!key.includes("$") && !key.includes("/") && key.length < 6)
	})
}

module.exports.indexes = () => {return _.keys(products).filter(key => key.includes("$"))},
module.exports.futures = () => {return _.keys(products).filter(key => key.includes("/"))},
module.exports.options = () => {return _.keys(products).filter(key => key.includes("_"))}
	

module.exports.exists = (key) => {(products[key]) ? true : false}

module.exports.add = (items) => {
	let equitiesChange = false
	let indexesChange = false
	let futuresChange = false
	let optionsChange = false

	
	items.map(key => {
		if (key.instrument) {
			symbol = key.instrument.symbol
		} else if (key != "") {
			symbol = key
		}

		if (!products[symbol]) {
			let type = isType(symbol)
			products[symbol] = { key: symbol, assetType: type, spark: [] }

			switch (type){
				case "equities":
					equitiesChange = true
					break;
				case "indexes":
					indexesChange = true
					break;
				case "futures":
					futuresChange = true
					break;
				case "options":
					optionsChange = true
					break;

			}
		}
	})

	//if (optionsChange || indexesChange || futuresChange) { console.log(optionsChange, indexesChange, futuresChange); }
	if (equitiesChange) { 
		tdaSocket.sendServiceMsg("equities", [...module.exports.equities(), ...module.exports.indexes()]); }
	if (futuresChange) { 
		tdaSocket.sendServiceMsg("futures", module.exports.futures()) }
	if (optionsChange) { 
		tdaSocket.sendServiceMsg("options", module.exports.options() ) }
}


module.exports.remove = (items) => {
	let change = false
	items.map(key => {
		if (products[key])
			delete products[key]
		change = true
	})
}

module.exports.tick = (tick) =>{
	products[tick.key] = { ...products[tick.key], ...tick }
}

module.exports.addChartData = (m) => {
	switch (isType(m.key)){
		case "equities":
		case "indexes":
			mysql.query(`insert into chartdata (\`key\`,\`datetime\`,o,h,l,c,v) 	VALUES ('${m.key}', ${m[7]}, ${m[1]}, ${m[2]}, ${m[3]}, ${m[4]}, ${m[5]})
			ON DUPLICATE KEY UPDATE  o = ${m[1]}, h = ${m[2]}, l = ${m[3]}, c = ${m[4]}, v = ${m[5]}`)
			break;
		case "futures":
			mysql.query(`insert into chartdata (\`key\`,\`datetime\`,o,h,l,c,v) 	VALUES ('${m.key}', ${m[1]}, ${m[2]}, ${m[3]}, ${m[4]}, ${m[5]}, ${m[6]})
			ON DUPLICATE KEY UPDATE  o = ${m[2]}, h = ${m[3]}, l = ${m[4]}, c = ${m[5]}, v = ${m[6]}`)
			break;
		case "options":
			mysql.query(`insert into chartdata (\`key\`,\`datetime\`,o,h,l,c,v) 	VALUES ('${m.key}', ${m[7]}, ${m[1]}, ${m[2]}, ${m[3]}, ${m[4]}, ${m[5]})
			ON DUPLICATE KEY UPDATE  o = ${m[1]}, h = ${m[2]}, l = ${m[3]}, c = ${m[4]}, v = ${m[5]}`)
			break;
	}
	//console.log(products[m.key])
	// if (!products[m.key]){
	// 	//debugger
	// 	products[m.key] = {...m, ...{spark: []}}
	// }else if ( !products[m.key].spark ) { products[m.key].spark = []}

	// products[m.key].spark.push(m);
	// while (products[m.key].spark.length > 0 && products[m.key].spark[0][7] < (Date.now() - (24*60*60*1000))){
	// 	//console.log(`popping old chart data ${moment( products[m.key].spark[0][7]).startOf('day').fromNow()}`  )
	// 	products[m.key].spark.shift()
	// }
}

function isType(key) {
	//console.log(key)
	try {
		if (!key.includes("$") && !key.includes("/") && key.length < 6) return "equities";
		if (key.includes("$") && !key.includes("/")) return "indexes";
		if (!key.includes("$") && key.includes("/")) return "futures";
		if (!key.includes("$") && !key.includes("/") && key.length > 5) return "options";
	} catch (error) {
		console.log(error)
		debugger;
	}
}


