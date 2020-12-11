const auth = require('../monitor')
const request = require("request");
const moment = require("moment");
const endpoint = 'https://api.tradier.com/v1/'
const headers = {
	'Authorization': 'Bearer ',
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
		getdata('markets/history',qs).then((data) => {
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
		getdata('markets/options/chains',qs).then((data) => {
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
		getdata('markets/options/strikes',qs).then((data) => {
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
		getdata('markets/options/strikes',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};


module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
	let qs = {
		'symbol': symbol,
		'interval': interval,
		'start': start,
		'end': end
	  }

	return new Promise((result, error) => {
		getdata('markets/history',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};


module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
	let qs = {
		'symbol': symbol,
		'interval': interval,
		'start': start,
		'end': end
	  }

	return new Promise((result, error) => {
		getdata('markets/history',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};


module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
	let qs = {
		'symbol': symbol,
		'interval': interval,
		'start': start,
		'end': end
	  }

	return new Promise((result, error) => {
		getdata('markets/history',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};


module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
	let qs = {
		'symbol': symbol,
		'interval': interval,
		'start': start,
		'end': end
	  }

	return new Promise((result, error) => {
		getdata('markets/history',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};


module.exports.getHistoricalQuotes = (symbol, interval, start, end) => {
	let qs = {
		'symbol': symbol,
		'interval': interval,
		'start': start,
		'end': end
	  }

	return new Promise((result, error) => {
		getdata('markets/history',qs).then((data) => {
			console.log(result(data));
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};





module.exports.getData = (url,query) => {
	//console.log(moment(Date.now()).format(), endpoint)
    	return new Promise((result, fail) => {
		const options = {
			method: 'GET',
			headers: headers,
			url: endpoint + url,
			qs: query
		};

		request(options, function (error, response, body) {
			//console.log(response)
			if (response && response.statusCode === 200) {
				if (body != "") {
					//console.log(moment(Date.now()).format() + body)
					let j = JSON.parse(body)
					console.log(moment(Date.now()).format() + j);
					lastFetchTime = Date.now()
					result(j)
				} 
				else
				{
					fail(response)
				}
			}
			else if (response){
				console.log(moment(Date.now()).format() + response);
			} 
			else {
				fail(error)
			}
		})
   	 });
}