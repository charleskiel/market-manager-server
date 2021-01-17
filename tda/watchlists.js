const _ = require("lodash");
const moment = require("moment");
const auth = require("./auth");
const mysql = require("../mysql.js");
const tdaSocket = require("./tdaSocket");
const getdata = require("./getdata").getData;
//const monitor = require("../monitor").monitor;
const Product = require("../productClass").Product

module.exports.watchlists = {};

module.exports.allWatchlistKeys = (lists) => {
	let list = []
	lists.map((_list) => {
		_list.watchlistItems.map((_item) => {
			list.push(new Product(_item.instrument.symbol));
		});
	});
	tdaSocket.event.emit("monitorAddItems", list)
	//monitor. add(list)
	return list
}

module.exports.fetchWatchlists = () => {
	return new Promise((result, error) => {
		getdata(`https://api.tdameritrade.com/v1/accounts/${auth.accountId()}/watchlists`,"fetchWatchlists").then((data) => {
			console.log(moment(Date.now()).format(), `: Fetched  watchlists`)
			module.exports.watchlists = data;
			transferWatchlists(data).then( () => {
				module.exports.allWatchlistKeys(data);
				//console.log(`${_.keys(monitor.equities()).length} equities, ${_.keys(monitor.futures()).length} futures, and ${_.keys(monitor.indexes()).length} indexes in ${data.length} Watchlists`);
				result(data);

			})
		}).catch(() => {
			console.log(error)
			debugger
		});
	});
};

function transferWatchlists(lists){
	promises = []
	return new Promise((result, error) => {
		lists.forEach(list => {
			//mysql.query(`insert into watchlists set name = '${list.name}', items = '${JSON.stringify(list.watchlistItems.map(i => {return i.instrument.symbol} ))}'`)
			promises.push(
				mysql.query(`insert into watchlists (name,items) 	VALUES ('${list.name}', '${JSON.stringify(list.watchlistItems.map(i => {return i.instrument.symbol} ))}') 
				ON DUPLICATE KEY UPDATE  name = '${list.name}', items = '${JSON.stringify(list.watchlistItems.map(i => {return i.instrument.symbol} ))}'`)
				// .then(result(`Watchlist ${list.name} updated`))
				// .catch(fail(`Problem updating watchlist ${list.name}`))
				)
			});
		
		p = Promise.all(promises)
		.then(() => {
			result(p)
		})
		.catch(() => {
			error(`Problem updating watchlist ${lists}`)
		})
}	)
}

module.exports.loadWatchlists = () => {
	return new Promise((result, fail) => {

		mysql.query("select * from watchlists", function(results, fields, error) {
			module.exports.watchlists = results

			results = results.map(r =>{
				return {id: r.id, name: r.name, items: JSON.parse(r.items)}
			})

 			
		}).then(() => {
			module.exports.allWatchlistKeys(results)

			result(results)
		})
		.catch(() => {
			fail(error)
		})
	})
}

module.exports.saveWatchlist = () => {

};


