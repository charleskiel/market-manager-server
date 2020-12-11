const auth = require('./auth')
const request = require("request");
const moment = require("moment");

var lastFetchTime = 0;

module.exports.getLastFetchTime = () => {lastFetchTime}

module.exports.getWatchlists = () => {
	return new Promise((result, error) => {
		getdata(`https://api.tdameritrade.com/v1/accounts/${auth.accountId()}/watchlists`).then((data) => {
			//console.log(moment(Date.now()).format(), `: Got  watchlists`)
			//debugger
			watchlists = data;
			//console.log(watchlists)
			transferWatchlists(data)
			monitor.add(module.exports.allWatchlistKeys());
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
		getdata(`https://api.tdameritrade.com/v1/instruments/${key}`).then((data) => {
            console.log(data)
			//debugger
			result(data);
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};
module.exports.chains = (symbol) => {
	return new Promise((result, error) => {
		module.exports.getData(`https://api.tDameritrade.com/v1/marketdata/chains?symbol=${symbol}&includeQuotes=TRUE`)
			.then((data) => {
				result(data);
			})
			.catch((fail) => {
				error(fail);
			});
	});
};

module.exports.getData = (endpoint) => {
    //console.log(moment(Date.now()).format(), endpoint)
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
                    let j = JSON.parse(body)
                    //console.log(moment(Date.now()).format() + j);
                    lastFetchTime = Date.now()
                    result(j)
                } 
                else
                {
                    fail(response.statusMessage)
                }
            }
            else if (response){
                let j = JSON.parse(body)
                switch (response.statusCode) {
                    case 401:
                        if (j.error = "The access token being passed has expired or is invalid.") {
                            auth.refresh()
                            //debugger
                        }
                        else {
                            console.log(moment(Date.now()).format() + ': 401 hint: refresh token');
                            //console.log(moment(Date.now()).format(), refreshAccessToken)
                            auth.refresh();
                        }
                        break;

                    default:
                        console.log(moment(Date.now()).format() + `: ERROR: ${response.statuscode}:::  ${response.statusMessage}`);
                        break;
                }

                //fail(`"ERROR" ${response.statusCode}`)
            } 
            else {
                fail(error)
            }
        })
    });
}