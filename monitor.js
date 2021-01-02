const { promisify } = require('util');
const moment = require("moment");
const tradier = require('./tradier/tradier.js');
const tda = require('./tda/tda.js');
const mysql = require('./mysql.js');
const _ = require("lodash");
const Product = require("./productClass.js").Product;

var EventEmitter2 = require("eventemitter2");

var event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});


todo = []
// const EventEmitter2 = require("eventemitter2");

// module.exports.event = new EventEmitter2({
// 	wildcard: true,
// 	delimiter: ".",
// 	newListener: false,
// 	removeListener: false,
// 	verboseMemoryLeak: false,
// 	ignoreErrors: false,
// });


products = []
actives = {
	ACTIVES_NASDAQ: {},
	ACTIVES_NYSE: {},
	ACTIVES_OTCBB: {},
	ACTIVES_OPTIONS: {}
}



exports.monitor = {
	list : () => {return products},
	load: load,
	products: products,
	addProducts: addProducts,
	equities : equities,
	indexes : indexes ,
	futures : futures,
	options: options,
	actives: actives,
	event : event
}

function load() {}

tda.socket.event.on("monitorAddItems", addProducts)
tda.socket.event.on("monitorAddChartData", (data) => {products[data.key].addChartData(data)})
tda.socket.event.on("tdaQuote", (data) => {products[data.key].tdaQuote(data)})
tda.socket.event.on("tdaTimesale", (data) => {products[data.key].tdaTimesale(data)})
tda.socket.event.on("LEVELONE_FUTURES", (data) => {products[data.key].tdaFuturesQuote(data)})
tda.socket.event.on("ACTIVES_NASDAQ", addActives)
tda.socket.event.on("ACTIVES_NYSE", addActives)
tda.socket.event.on("ACTIVES_OTCBB", addActives)
tda.socket.event.on("ACTIVES_OPTIONS", addActives)

function addProducts(items){
	let equitiesChange = false;
	let indexesChange = false;
	let futuresChange = false;
	let optionsChange = false;
	items.map((item) => {
		if (!products[item.key]) {
			products[item.key] = item
			switch (item.type) {
				case "equity":
					equitiesChange = true;
					break;
				case "index":
					indexesChange = true;
					break;
				case "future":
					futuresChange = true;
					break;
				case "option":
					optionsChange = true;
					break;
			}
		}
	});

	//if (optionsChange || indexesChange || futuresChange) { console.log(optionsChange, indexesChange, futuresChange); }
	if (equitiesChange) {
		tda.socket.sendServiceMsg("equities", [...equities(), ...indexes()]); }
	if (futuresChange) {
		tda.socket.sendServiceMsg("futures", futures()) }
	if (optionsChange) {
		tda.socket.sendServiceMsg("options", options() ) }
}

function indexes(){return _.keys(products).filter(key => key.includes("$"))}
function futures(){return _.keys(products).filter(key => key.includes("/"))}
function options(){return _.keys(products).filter(key => key.includes("_"))}
function equities(){
		return _.keys(products).filter(key => {
			return (!key.includes("$") && !key.includes("/") && key.length < 6)
		})
}

function tradierData(msg) { }





function addActives(data){
	//'4896;0;1:21:00;01:21:36;2;0:10:5341501:TSLA_121120C650:TSLA Dec 11 2020 650 Call:30439:0.57:TSLA_121120C700:TSLA Dec 11 2020 700 Call:24301:0.45:AAPL_121120C125:AAPL Dec 11 2020 125 Call:18369:0.34:TSLA_121120C630:TSLA Dec 11 2020 630 Call:16585:0.31:PLTR_121120C30:PLTR Dec 11 2020 30 Call:15938:0.3:TSLA_121120C640:TSLA Dec 11 2020 640 Call:15661:0.29:SPY_120720C369:SPY Dec 7 2020 369 Call:11761:0.22:SPY_120720P368:SPY Dec 7 2020 368 Put:11515:0.22:BA_121120C250:BA Dec 11 2020 250 Call:11137:0.…P368:SPY Dec 7 2020 368 Put:174854:0.55:SPY_120720C369:SPY Dec 7 2020 369 Call:146119:0.46:AAPL_121120C125:AAPL Dec 11 2020 125 Call:129594:0.4:SPY_120720P369:SPY Dec 7 2020 369 Put:116933:0.36:TSLA_121120C650:TSLA Dec 11 2020 650 Call:90102:0.28:SPY_120720C370:SPY Dec 7 2020 370 Call:87910:0.27:PLTR_121120C30:PLTR Dec 11 2020 30 Call:82489:0.26:TSLA_121120C700:TSLA Dec 11 2020 700 Call:70707:0.22:VIX_121620P19:VIX Dec 16 2020 19 Put:61588:0.19:SPY_120920C370:SPY Dec 9 2020 370 Call:57718:0.18'
	let items = [];
	switch (data.service) {
		case "ACTIVES_NASDAQ":
		case "ACTIVES_NYSE":
		case "ACTIVES_OTCBB":
			var split = data.content[0]["1"].split(";");
			if (split.length > 1) {
				var o = {
					timestamp: data.timestamp,
					"ID:": split[0],
					sampleDuration: split[1],
					"Start Time": split[2],
					"Display Time": split[3],
					GroupNumber: split[4],
					groups: [],
				};
				split = split[6].split(":");
				o.totalVolume = split[0];
				o.groupcount = split[1];
				for (let i = 3; i < split.length; i += 3) {
					if (!products[split[i]]) {
						items.push(split[i]);
					}
					o.groups.push({ symbol: split[i], volume: split[i + 1], priceChange: split[i + 2] });
				}

				actives[data.service][o.sampleDuration] = o;
			}
			break;
		case "ACTIVES_OPTIONS":
			//console.log(moment(Date.now()).format() + ": OPTIONS Activies")
			//console.log(m)
			//debugger
			data.content.map((act) => {
				var split = act["1"].split(";");
				if (split[1]) {
					var o = {
						timestamp: data.timestamp,
						"ID:": split[0],
						sampleDuration: split[1],
						"Start Time": split[2],
						"Display Time": split[3],
						GroupNumber: split[4],
						groups: [],
					};

					split = split[6].split(":");
					o.totalVolume = split[3];
					o.groupcount = split[1];
					//o.sampleDuration
					for (let i = 3; i < split.length; i += 4) {
						if (!products[split[i]]) {
							items.push(split[i]);
						}
						o.groups.push({ symbol: split[i], name: split[i + 1], volume: split[i + 2], percentChange: split[i + 3] });
					}

					//console.log(moment(Date.now()).format() + `: Default Message: ` + data.service, m);
					//console.log(moment(Date.now()).format() + m);
					actives.ACTIVES_OPTIONS[o.sampleDuration] = o;
				}
			});
	}

	if (items.length > 0) {
		//Add items to monitor
		let products = [...items.map(item => { return new Product(item) })] ;
		addProducts(products);
		console.log(data.service);
		console.log(actives[data.service]);
	}
}
const sleep = promisify(setTimeout);

setInterval(function () {
	if (tradier.aggregate()) {
		if (todo.length > 0) {
			key = todo[0]
			console.log(todo.length + "left, doing " + key)
			//console.log(products[key].todo.done);
			products[key].getChartHistory()
			todo.shift();
		}
	}
}, 10000)


setTimeout(function () {
	_.keys(products).map(key => {
		todo.push(key)
	})
}, 5000)

// setInterval(function () {
// 	pCount = 0
// 	var day = -2;
// 	let  update = false
// 	_.keys(products).map(async (key) => {
// 		update = false
// 		if (products[key].type != "future") {
// 			pCount += 1;
// 			//if (key == "CVS") debugger
// 			do {
// 				//console.log(moment(moment().utcOffset("-05:00").startOf("day").unix()) * 1000);
// 				//console.log(moment(moment().utcOffset("-05:00").startOf("day").add(day, "day").unix()) * 1000);
// 				//console.log(moment(moment().utcOffset("-05:00").startOf("day").add(day + 1, "day").unix()) * 1000);
// 				let unixDay = moment(moment().utcOffset("-05:00").startOf("day").add(day, "day").unix()) * 1000;
// 				let nextUnixDay = moment(moment().utcOffset("-05:00").startOf("day").add(day + 1, "day").unix()) * 1000;
// 				//console.log(moment(unixDay).weekday());
				
// 				if (moment(unixDay).weekday() !== 0 && moment(unixDay).weekday() !== 6) {
// 					let prom = mysql.query(`select \`key\`, ${unixDay} unixDay, count(*) count  from CHART_EQUITY where \`timestamp\` > ${unixDay} and \`timestamp\` < ${nextUnixDay} and \`key\` = '${key}'`,null,{ key: key, unixDay: unixDay, nextUnixDay: nextUnixDay })
// 						.then((results) => {
							
// 							if (results[0].count == 0) {
// 								products[key]["todo"][results.params.unixDay] = results[0].count;
// 								console.log(`${results[0].count} for ${results.params.key} on ${moment(results[0].unixDay).format()} (in ${results.ts})`);
// 								if (results.params.nextUnixDay > products[key].todo.end) products[key].todo.end = results.params.nextUnixDay; update = true; //debugger;
// 								if (results.params.unixDay < products[key].todo.start || products[key].todo.start == 0) products[key].todo.start = results.params.unixDay; update = true; //debugger;
// 								products[key].todo.range = moment.duration(products[key].todo.end - products[key].todo.start).asDays();
// 								if (products[key].todo.end == 0 || products[key].todo.start == 0) debugger
// 							}
// 						});
// 					await prom;
// 				}

// 				day -= 1;
// 			} while (day > -7);
// 		}
// 		if (update == true) {
// 			if (products[key].todo.end == 0 || products[key].todo.start == 0) //debugger;

// 			products[key].todo.done = false;
// 		}
// 		if (pCount > 50) return true;
// 		day = 0;
// 	});

// }, 5000);

