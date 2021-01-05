const fs = require("fs");
//const auth = require('../monitor')
const request = require("request");
const moment = require("moment");
let principals = JSON.parse(fs.readFileSync("./auth/tradier.json"));
var EventEmitter2 = require("eventemitter2");


let event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});
module.exports.event = event

const endpoint = 'https://api.tradier.com/v1/'
const headers = {
	'Authorization': 'Bearer ' + principals.accessToken,
	'Accept': 'application/json'
   }


var lastFetchTime = 0;

module.exports.getLastFetchTime = () => {return lastFetchTime}



module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
	let qs = {
		'symbol': symbol,
		'interval': interval,
		'start': start,
		'end': end
	}

	return new Promise((result, error) => {
		getData('markets/history',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};


module.exports.getOptionChains = (symbol, expiration) => {
	let qs = {
		'symbol': symbol,
		'expiration': expiration,
		'greeks': 'true'
	}

	return new Promise((result, error) => {
		getData('markets/options/chains',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};

module.exports.getOptionStrikes = (symbol, expiration) => {
	let qs = {
		'symbol': symbol,
		'expiration': expiration,
		'greeks': 'true'
	}

	return new Promise((result, error) => {
		getData('markets/options/strikes',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};

module.exports.getOptionExpirations = (symbol) => {
	let qs = {
		'symbol': symbol,
		'incudeAllRoots': 'true',
		'strikes': 'true'
	}

	return new Promise((result, error) => {
		getData('markets/options/strikes',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};


module.exports.getStreamingSession = () => {
	return new Promise((result, error) => {
		getData('markets/events/session', {}, 'POST')
			.then((data) => {
				console.log(data);
				result(data);
			}).catch(error => {
				console.log(error)
				debugger
		});
	});
};


module.exports.getTimeSales = (symbol, interval, start, end) => {
	let qs = {
		symbol: symbol,
		interval: interval,
		start: moment(start).format("YYYY-MM-DD"),
		end: moment(end).format("YYYY-MM-DD"),
		session_filter: "all",
	};
	//console.log(qs)
	return new Promise((result, error) => {
		getData('markets/timesales', qs).then((data) => {
			
			module.exports.event.emit("dataCount", ["httpCount", 1]);
			module.exports.event.emit("dataCount", ["httpDataRx", data.data.length * 2]);
			//console.log(data.series.data);
			if (data.series.data) {result(data.series.data)} else {result([])}
			//debugger
		}).catch(e => {
			console.log(e)
			//debugger
		});
	});
};


// module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
// 	let qs = {
// 		'symbol': symbol,
// 		'interval': interval,
// 		'start': start,
// 		'end': end
// 	  }

// 	return new Promise((result, error) => {
// 		getData('markets/history',qs).then((data) => {
// 			console.log(result(data));
// 		}).catch(error => {
// 			console.log(error)
// 			debugger
// 		});
// 	});
// };


// module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
// 	let qs = {
// 		'symbol': symbol,
// 		'interval': interval,
// 		'start': start,
// 		'end': end
// 	  }

// 	return new Promise((result, error) => {
// 		getData('markets/history',qs).then((data) => {
// 			console.log(result(data));
// 		}).catch(error => {
// 			console.log(error)
// 			debugger
// 		});
// 	});
// };


// module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
// 	let qs = {
// 		'symbol': symbol,
// 		'interval': interval,
// 		'start': start,
// 		'end': end
// 	  }

// 	return new Promise((result, error) => {
// 		getData('markets/history',qs).then((data) => {
// 			console.log(result(data));
// 		}).catch(error => {
// 			console.log(error)
// 			debugger
// 		});
// 	});
// };





getData = (url,query, method = 'GET') => {
	//console.log(moment(Date.now()).format(), endpoint)
	try {
		return new Promise((result, fail) => {
			const options = {
				method: method,
				headers: headers,
				url: endpoint + url,
				qs: query,
				"Content-length" : 0
			};
			console.log(options)
			request(options, function (error, response, body) {
				if(error) console.log(error) 
				if (response && response.statusCode === 200) {
					//console.log(moment(Date.now()).format() + body)
					event.emit("getdata",[url,{},body.length])
					let j = JSON.parse(body)
					console.log(moment(Date.now()).format(),j);
					lastFetchTime = Date.now()
					result(j)

				}
				else if (response) {
					console.log(body,error, url, query);
					fail({body,error,url, query})
				} 
				else {
					console.log(body,error, url, query);
					fail({body,error,url, query})
				}
			})
		});
	} catch (error) {
		console.log(error)
	}
    	
}