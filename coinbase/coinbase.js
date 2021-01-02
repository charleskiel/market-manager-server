const fs = require('fs');
//const Alpaca = require('@alpacahq/alpaca-trade-api')
let auth = JSON.parse(fs.readFileSync("./auth/coinbase.json", (err) => { if (err) console.error(err); }))
const socket = require('./coinbaseSocket')
   
module.exports.socket = socket
socket.load(auth)
const request = require('request');
const moment = require('moment');// const CoinbasePro = require('coinbase-pro')



// const websocket = new CoinbasePro.WebsocketClient(
// 	['BTC-USD', 'ETH-USD'],
// 	'wss://ws-feed-public.sandbox.pro.coinbase.com',
// 	{
// 	  key: 'suchkey',
// 	  secret: 'suchsecret',
// 	  passphrase: 'muchpassphrase',
// 	},
// 	{ channels: ['full', 'level2'] }
//    );

// watchlist = ["ETH-USD","LTC-USD","XRP-USD","ETC-USD","BCH-USD"]

// websocket.subscribe({
// 	product_ids: watchlist,
// 	channels: [
// 		"level2",
// 		"full",
// 		"heartbeat",
// 		{
// 			name: "ticker",
// 			product_ids: watchlist
// 		}
// 	]
// })
