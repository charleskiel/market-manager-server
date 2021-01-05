const socket = require('./coinbaseSocket')
   

//module.exports.socket = socket
module.exports.socket = socket
module.exports.socketData = socket.socketData
module.exports.load = () => {
	socket.load()
}

// const request = require('request');
// const moment = require('moment');// const CoinbasePro = require('coinbase-pro')