const fs = require('fs');
const Alpaca = require('@alpacahq/alpaca-trade-api')
const auth = JSON.parse(fs.readFileSync("../auth/alpaca.json", (err) => { if (err) console.error(err); }))


const alpaca = new Alpaca(auth)



   
const request = require('request');
const moment = require('moment');
const api = {
	"APCA-API-KEY-ID" : "PKO9GWMZK2KN2WSMUG6U",
	"APCA-API-SECRET-KEY" : "e28zy2JsJ2jxzpz67y7nD9cyxiO050nyFOtvwRME",
	"ENDPOINT" : "https://paper-api.alpaca.markets"
}




module.exports.refresh = () => {
	//api = JSON.parse(fs.readFileSync('./alpaca/api.json'))
	console.log("Starting")
	test()
}

module.exports.quote = (req) => {
	return new Promise((result, error) => {
		console.log(req)
		getdata(api.endpoint + "/v1/last_quote/stocks/" + req.query.symbol )
		.then((fetch) => {result(JSON.parse(fetch))})
		.catch((fail) => { error(fail) })
	})
}

module.exports.priceHistory = (req) => {
    return new Promise((result, error) => {
	alpaca.getBars('1Min', req.symbols.toString(), {start:'2020-04-20', end:'2020-04-29'}).then((response) => {
          console.log(response)
		result(response)
     })
	error("error")
    })
}




function getdata(endpoint) {
	console.log(endpoint)
	return new Promise((result, fail) => {
		const options = {
			headers: api,
			
			url: endpoint,
			method: 'GET',
		};

		request(options, function (error, response, body) {
			if (response.statusCode === 200) {
				if (body != "") {
				
				console.log(body)
				let j = JSON.parse(body)
				console.log(j);
				result(j)
				} else
				{
					fail(response.statusMessage)
					}
				
			}
			else {
				switch (response.statusCode) {
					case 401:
					console.log('401 hint: refresh token');
					refreshAccessToken();
					break;
					default:
					console.log(`ERROR: ${response.statuscode}:::  ${response.statusMessage}`);
					break;
				}
				fail({
					name: response.statusCode,
					message: "ERROR"
				})

			} 
			
		})

	});


}

function test(){


	   
	//console.log("Quote")
	//console.log(module.exports.quote({req : {query: {symbol: "roku"}}}))
}


// module.exports.collectData = collectData

// async function collectData (){
// 	const limit = 1000

// 	const start = moment( Date.now())
// 	const end = moment( Date.now()).subtract(1,"d")
// 	var lastdate = moment(Date.now())
// 	for (let day = 0; day < 7; day++) {
		
		
// 		//moment.unix(response.ROKU[0].startEpochTime).difference(moment.unix(response.ROKU[response.ROKU.length - 1].startEpochTime), "hours" ).format("DDDo  h:mm:ss a ")
		
		
// 		result = await alpaca.getBars('1Min', ["ROKU"], {limit : limit , start: moment(lastdate).subtract(1, "day").format('YYYY-MM-DD'), end: moment(lastdate).format('YYYY-MM-DD')})
// 		.then((response) => {
// 			// response.ROKU.map(tick => {
// 				// 	console.log(`${moment.unix(tick.startEpochTime).toString()}  ${tick.openPrice}`)
// 				// })
// 				//console.log(moment(lastdate).format())
// 				return response
// 				debugger
// 			})
// 		console.log(`========================================================================================`)
// 		console.log(`# ${day}`)
// 		console.log(result)
// 		console.log(`Day: ${lastdate}`)
// 		console.log(`Geting ${limit} bars for ${moment(lastdate).format()}`)
// 		console.log(`start: ${moment(lastdate).subtract(1, "day").format('YYYY-MM-DD')}, end: ${moment(lastdate).format('YYYY-MM-DD')}`)
// 		console.log(``)
// 		console.log(`Got ${result.ROKU.length} candles from ${moment.unix(result.ROKU[0].startEpochTime).format("MMM Do  h:mm:ss a")} -> ${moment.unix(result.ROKU[result.ROKU.length - 1].startEpochTime).format("Do  h:mm:ss a ")}`)
// 		console.log(`${result.ROKU[0].startEpochTime} -> ${(result.ROKU[result.ROKU.length - 1].startEpochTime)}`)
// 		console.log(`${moment.unix(result.ROKU[0].startEpochTime).format()} -> ${moment.unix(result.ROKU[result.ROKU.length - 1].startEpochTime).format()}`)
// 		lastdate = moment.unix(result.ROKU[0].startEpochTime)
// 		//.then()
// 		//.catch((fail) => {console.log(fail)})
// 		console.log(result)

// 	}
	
	

// }
