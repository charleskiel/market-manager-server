const _ = require("lodash");
const moment = require("moment");
const auth = require("./auth");
const mysql = require("../mysql.js");
const tdaSocket = require("./tdaSocket");
const getdata = require("./getdata").getData;
const monitor = require("./monitor");

var watchlists = {};

module.exports.allWatchlistKeys = () => {
	let list = []
	watchlists.map((_list) => {
		_list.watchlistItems.map((_item) => {
			list.push(_item.instrument.symbol);
		});
	});

	return list
}

module.exports.getWatchlists = () => {
	return new Promise((result, error) => {
		getdata(`https://api.tdameritrade.com/v1/accounts/${auth.accountId()}/watchlists`).then((data) => {
			//console.log(moment(Date.now()).format(), `: Got  watchlists`)
			//debugger
			watchlists = data;
			//console.log(watchlists)
			
			monitor.add(module.exports.allWatchlistKeys());
			console.log(`${_.keys(monitor.equities()).length} equities, ${_.keys(monitor.futures()).length} futures, and ${_.keys(monitor.indexes()).length} indexes in ${data.length} Watchlists`);
			result(data);
		}).catch(error => {
			console.log(error)
			debugger
		});
	});
};
module.exports.saveWatchlist = () => {

};


