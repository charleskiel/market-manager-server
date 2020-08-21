const _ = require("lodash");
const moment = require("moment");

const mysql = require("../mysql.js");
const tdaSocket = require("./tdaSocket");

module.exports.actives = {
	ACTIVES_NASDAQ: {},
	ACTIVES_NYSE: {},
	ACTIVES_OPTIONS: {},
	ACTIVES_OTCBB: {},
};
products = []
module.exports.defaultFutures = [
	"/ES", // S&P 500
	"/ES", // S&P MidCap 400
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

module.exports.defaultStocks = ["QQQ","SPY","GLD","AMD","HD","NVDA","ACB","WMT","BJ","TGT","MSFT","NVDA","ROKU","NFLX","ADBE","SHOP","TSLA","GOOG","AMZN","JNJ","BYND","SMH","MU","LOW","DIS","FDX","CAT","MMM","UPS","YUM","DLTR","BANK","BBY","UBS"]
module.exports.list = () => {return products}

module.exports.equities = () => {

	let k = _.keys(products);
	let kk = _.keys(products);
	let result = _.keys(products).filter(key => {
		return (!key.includes("$") && !key.includes("/") && key.length < 6)

	})
	return result
},
module.exports.indexes = () => { return _.keys(products).filter(key => key.includes("$")) },
module.exports.futures = () => { return _.keys(products).filter(key => key.includes("/")) },
module.exports.options = () => { 
	let e = _.keys(products).filter(key => key.includes("_") )
	return _.keys(products).filter(key => key.includes("_") )
	}
	

module.exports.exists = (key) => {(products[key]) ? true : false}
module.exports.add = (items) => {
	let equitiesChange = false
	let indexesChange = false
	let futuresChange = false
	let optionsChange = false

	
	items.map(key => {
		if (!products[key]) {
			if (!products[key]) products[key] = { key: key, spark: [] }
			let type = isType(key)
			if (type === "indexes") { indexesChange = true }
			if (type === "equities") { equitiesChange = true }
			if (type === "futures") { futuresChange = true }
			if (type === "options") { optionsChange = true }
		}
	})
	if (optionsChange || indexesChange || futuresChange) { console.log(optionsChange, indexesChange, futuresChange); }
	if (equitiesChange) { 
		let e = [...module.exports.defaultStocks, ...module.exports.equities(), ...module.exports.indexes()]
		
		tdaSocket.sendServiceMsg("equities", [...module.exports.defaultStocks, ...module.exports.equities(), ...module.exports.indexes()]); }
	if (futuresChange) { 
		e = module.exports.futures()
		tdaSocket.sendServiceMsg("futures", e) }
	if (optionsChange) { 
		e = module.exports.options()
		tdaSocket.sendServiceMsg("options", e) }
}


module.exports.remove = (items) => {
	let change = false
	items.map(key => {
		if (products[key])
			delete products[key]
		change = true
	}
	)
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
	if (!products[m.key]){
		//debugger
		products[m.key] = {...m, ...{spark: []}}
	}else if ( !products[m.key].spark ) { products[m.key].spark = []}

	products[m.key].spark.push(m);
	while (products[m.key].spark.length > 0 && products[m.key].spark[0][7] < (Date.now() - (24*60*60*1000))){
		//console.log(`popping old chart data ${moment( products[m.key].spark[0][7]).startOf('day').fromNow()}`  )
		products[m.key].spark.shift()
	}
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