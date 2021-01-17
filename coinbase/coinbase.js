const mysql = require("../mysql.js");
const socket = require('./coinbaseSocket')
const request = require("request");
   

//module.exports.socket = socket
module.exports.socket = socket
module.exports.socketData = socket.socketData
module.exports.load = () => {
	socket.load()
}

// const request = require('request');
// const moment = require('moment');// const CoinbasePro = require('coinbase-pro')








getData = (product) => {
	//console.log(endpoint,type)
	lastFetchTime = Date.now();
	return new Promise((result, fail) => {
		const options = {
			//headers: auth.getAuthorizationHeader(),
			url: `https://api-public.sandbox.pro.coinbase.com/products/${product}/candles`,
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