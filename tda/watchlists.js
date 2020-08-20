const _ = require("lodash");
const moment = require("moment");
const auth = require("./auth");
const mysql = require("../mysql.js");
const tdaSocket = require("./tdaSocket");
const getdata = require("./getdata").getData;
const monitor = require("./monitor");

var watchlists = {};

module.exports.allWatchlistKeys = (lists) => {
	let list = []
	lists.map((_list) => {
		_list.items.map((_item) => {
			list.push(_item);
		});
	});
	return list
}

// module.exports.getWatchlists = () => {
// 	return new Promise((result, error) => {
// 		getdata(`https://api.tdameritrade.com/v1/accounts/${auth.accountId()}/watchlists`).then((data) => {
// 			//console.log(moment(Date.now()).format(), `: Got  watchlists`)
// 			//debugger
// 			watchlists = data;
// 			//console.log(watchlists)
// 			transferWatchlists(data)
// 			monitor.add(module.exports.allWatchlistKeys());
// 			console.log(`${_.keys(monitor.equities()).length} equities, ${_.keys(monitor.futures()).length} futures, and ${_.keys(monitor.indexes()).length} indexes in ${data.length} Watchlists`);
// 			result(data);
// 		}).catch(error => {
// 			console.log(error)
// 			debugger
// 		});
// 	});
// };

function transferWatchlists(lists){
	lists.forEach(list => {
		mysql.query(`insert into watchlists set name = '${list.name}', items = ' ${JSON.stringify(list.watchlistItems.map(i => {return i.instrument.symbol} ))}  '`)
	});
}

module.exports.getWatchlists = () => {
	return new Promise((result, fail) => {

		mysql.query("select * from watchlists", function(results, fields, error) {
			//debugger
			results = results.map(r =>{
				return {id: r.id, name: r.name, items: JSON.parse(r.items)}
			})

 			monitor.add(module.exports.allWatchlistKeys(results));

			result(results)
			fail(error)
			// results.forEach(watchlist => {
				
				// });
		})
	})
}

module.exports.saveWatchlist = () => {

};


