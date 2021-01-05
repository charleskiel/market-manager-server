const mysql = require("../mysql.js");
const auth = require('./auth')
const request = require("request");
const moment = require("moment");
const EventEmitter2 = require("eventemitter2");

module.exports.event = new EventEmitter2({
	wildcard: true,
	delimiter: ".",
	newListener: false,
	removeListener: false,
	verboseMemoryLeak: false,
	ignoreErrors: false,
});

var lastFetchTime = 0;

module.exports.getLastFetchTime = () => { lastFetchTime }

module.exports.priceHistory = (key, params = null) => {
	return new Promise((result, error) => {
		//periodType: The type of period to show.Valid values are day, month, year, or ytd(year to date).Default is day.
		//period: The number of periods to show.
		//Example: For a 2 day / 1 min chart, the values would be:
		// period: 2
		// periodType: day
		// frequency: 1
		// frequencyType: min

		// Valid periods by periodType(defaults marked with an asterisk):

		// day: 1, 2, 3, 4, 5, 10 *
		// month: 1 *, 2, 3, 6
		// year: 1 *, 2, 3, 5, 10, 15, 20
		// ytd: 1 *

		let str = "";
		if (!params) {
			str = `https://api.tdameritrade.com/v1/marketdata/${key}/pricehistory?&periodType=day&period=10&frequencyType=minute&frequency=1&startDate=${
				moment(moment().utcOffset("-05:00").startOf("day").add(-30, "day").unix()) * 1000
			}`;
		} else {
			str = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?&periodType=${params.periodType}&period=${params.period}&frequencyType=${params.frequencyType}&frequency=${params.frequency}&startDate=${params.startDate}`;
		}

		module.exports.getData(str,"priceHistory")
			.then((data) => {
				result(data);
			})
			.catch((fail) => {
				error(fail);
			});
	});
};

module.exports.getWatchlists = () => {
	return new Promise((result, error) => {
		module.exports.getData(`https://api.tdameritrade.com/v1/accounts/${auth.accountId()}/watchlists`,"getWatchlists").then((data) => {
			//console.log(moment(Date.now()).format(), `: Got  watchlists`)
			watchlists = data;
			//console.log(watchlists)
			transferWatchlists(data)
			console.log(`${_.keys(monitor.equities()).length} equities, ${_.keys(monitor.futures()).length} futures, and ${_.keys(monitor.indexes()).length} indexes in ${data.length} Watchlists`);
			result(data);
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};

module.exports.getInsturment = (key) => {
	return new Promise((result, error) => {
		module.exports.getData(`https://api.tdameritrade.com/v1/instruments/${key}`,"getInsturment").then((data) => {
            console.log(data)
			result(data);
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};
module.exports.chains = (symbol) => {
	return new Promise((result, error) => {
		module.exports.getData(`https://api.tDameritrade.com/v1/marketdata/chains?symbol=${symbol}&includeQuotes=TRUE`,"chains")
			.then((data) => {
				result(data);
			})
			.catch((fail) => {
				error(fail);
			});
	});
};

module.exports.getData = (endpoint, type) => {
	console.log(endpoint,type)
	lastFetchTime = Date.now();
	return new Promise((result, fail) => {
		const options = {
			headers: auth.getAuthorizationHeader(),
			url: endpoint,
			method: 'GET',
		};

		request(options, function (error, response, body) {
		//console.log(response)
			if (response && response.statusCode === 200) {
				if (body != "") {
					//console.log(moment(Date.now()).format() + body)
					module.exports.event.emit("getData", [type, {},body.length]);
					let j = JSON.parse(body)
					//console.log(moment(Date.now()).format() + j);
					result(j)
				} else {
					mysql.log('tda', 'getData', 'warning', `${response.statuscode}: ${response.statusMessage}`)
					
					fail(response.statusMessage)
				}
			} else if (response) {
				try {
					
					let j = JSON.parse(body.replace("\\",""))
					switch (response.statusCode) {
					case 401:
						if (j.error = "The access token being passed has expired or is invalid.") {
							mysql.log('tda', 'accessToken', 'warning', `${response.statuscode}: ${j.error}`)
							auth.refresh()
						} else {
							mysql.log('tda', 'accessToken', 'warning', `${response.statuscode}: ${j.error}`)
							console.log(moment(Date.now()).format() + '401 hint: refresh token');
							auth.refresh();
						}
						break;
						default:
							mysql.log('tda', 'accessToken', 'error', `${response.statuscode}: ${j.error}`)
							console.log(moment(Date.now()).format() + `: ERROR: ${response.statuscode}:::  ${response.statusMessage}`);
							break;
						}
				} catch (e) {
					mysql.log('tda', 'accessToken', 'error', `${e.toString()}`)
				}
			} else {
				fail(error)
			}
		})
	});
}