const _ = require("lodash");

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
module.exports.allProducts = () => { return products }

module.exports.equities = () => {

	let k = _.keys(module.exports.allProducts());
	let kk = _.keys(module.exports.allProducts());
	let result = _.keys(module.exports.allProducts()).filter(key => {
		return (!key.includes("$") && !key.includes("/") && key.length < 6)

	})
	return result
},
module.exports.indexes = () => { return _.keys(module.exports.allProducts()).filter(key => (key.includes("$") && !key.includes("/"))) },
module.exports.futures = () => { return _.keys(module.exports.allProducts()).filter(key => (!key.includes("$") && key.includes("/"))) },
module.exports.options = () => { return _.keys(module.exports.allProducts()).filter(key => (!key.includes("$") && !key.includes("/") && key.length > 5)) }
	


module.exports.add = (items) => {
	let equitiesChange = false
	let indexesChange = false
	let futuresChange = false
	let optionsChange = false

	
	items.map(key => {
		if (!products[key]) {
			if (!products[key]) products[key] = { key: key, spark: [] }
			let type = isType(key)
			if (type == "indexes") { indexesChange = true }
			if (type == "equities") { equitiesChange = true }
			if (type == "futures") { futuresChange = true }
			if (type == "options") { optionsChange = true }
		}
	})
	if (tdaSocket.status.socketStatus === "connected") {
		
		if (optionsChange || indexesChange || futuresChange) { console.log(optionsChange, indexesChange, futuresChange); }
		if (equitiesChange) { tdaSocket.sendServiceMsg("equities", [...module.exports.equities(), ...module.exports.indexes()]) }
		if (futuresChange) { tdaSocket.sendServiceMsg("futures", module.exports.futures()) }
		if (optionsChange) { tdaSocket.sendServiceMsg("options", module.exports.options()) }
	}
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

module.exports.addChartData = (m) => {
	m.forEach((eq) => {
		//equityTick(eq)
		//console.log(eq)
		//products[eq.key].spark = [...products[eq.key].spark, eq];
		products[eq.key].spark.push(eq);
	});
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