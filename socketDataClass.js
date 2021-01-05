const _ = require("lodash");
const filesize = require('filesize')
const moment = require("moment");
const mysql = require("./mysql.js");
const EventEmitter2 = require("eventemitter2");
const { json } = require("body-parser");
const { result } = require("lodash");

products = []
class SocketData {
	service = ''
	event = new EventEmitter2({
		wildcard: true,
		delimiter: ".",
		newListener: false,
		removeListener: false,
		verboseMemoryLeak: false,
		ignoreErrors: false,
	});

	socketStatus =  ""
	socketConnectionTimeStamp = 0
	socketDisconnects = 0

	socketDataTx = 0
	socketDataRx =  0
	socketDataRxPm = 0
	socketDataRxPs = 0
	
	socketCountTx = 0
	socketCountRx =  0
	socketCountRxPm =  0
	socketCountRxPs =  0
	
	httpCount = 0
	httpCountPm = 0
	httpCountPs = 0
	httpDataRx = 0
	httpDataRxPm = 0
	httpDataRxPs = 0
	
	msgTypes = {}

	statsBuffer = {
		socketDataRxPm: 0,
		socketDataRxPs: 0,
		socketCountPm: 0,
		socketCountPs: 0,
		httpDataRxPm: 0,
		httpDataRxPs : 0,
		httpCountPm : 0,
		httpCountPs : 0,
	}
	getStats = () => {
		let keys = this.msgTypes

		return {
			"socketStatus" : this.socketStatus,
			"socketConnectionTimeStamp" : moment().subtract(this.socketConnectionTimeStamp).fromNow(),
			"socketDisconnects" : this.socketDisconnects,
			"socketDataTx" : filesize(this.socketDataTx),
			"socketDataRx" : filesize(this.socketDataRx),
			"socketDataRxPs" : filesize(this.socketDataRxPs),
			"socketCountTx" : this.socketCountTx,
			"socketCountRx" : this.socketCountRx,
			"socketCountTx" : this.socketCountTx,
			"socketCountRx" : this.socketCountRx,
			"httpCount" : this.httpCount,
			"httpDataRx" : filesize(this.httpDataRx),
			"httpDataRxPm": filesize(this.httpDataRxPm),
			"httpDataRxPs": filesize(this.httpDataRxPs),
			"messages": _.keys(keys).map(k =>  {
					let _key = k.toString()
					//console.log(_key)
					let result = {
						[_key]: {
							dataRx: filesize(keys[k].dataRx),
							count: keys[k].count,
							dataRxPs: filesize(keys[k].dataRxPs),
							countPs: keys[k].countPs,
							countPm: keys[k].countPm,
						}
					}
					//console.log(result)
					return result 
				})
			
		}
	}

	static globalData = {
		socketDataTx: 0,
		socketDataTxPm: 0,
		socketDataTxPs: 0,
		socketDataRx: 0,
		socketDataRxPm: 0,
		socketDataRxPs: 0,

		socketCountTx: 0,
		socketCountTxPm: 0,
		socketCountTxPs: 0,
		socketCountRx: 0,
		socketCountRxPm: 0,
		socketCountRxPs: 0,
		
		httpCount: 0,
		httpCountPm: 0,
		httpCountPs: 0,
		httpDataRx: 0,
		httpDataRxPm: 0,
		httpDataRxPs: 0
	}
	
	static globalDataBuffer = {
		socketDataTxPm: 0,
		socketDataTxPs: 0,
		socketDataRxPm: 0,
		socketDataRxPs: 0,
		socketCountTxPm: 0,
		socketCountTxPs: 0,
		socketCountRxPm: 0,
		socketCountRxPs: 0,
		httpCountPm: 0,
		httpDataRxPm: 0,
		httpDataRxPs: 0,
	}

	static getGlobalData = () => {
		//console.log(SocketData.globalData.socketDataRx)
		return {
			socketDataTx : filesize(SocketData.globalData.socketDataTx, {round: 4}),
			socketDataRx : filesize(SocketData.globalData.socketDataRx, {round: 4}),
			socketDataRxPm : filesize(SocketData.globalData.socketDataRxPm, {round: 4}),
			socketDataRxPs : filesize(SocketData.globalData.socketDataRxPs, {round: 4}),
			socketCountTx : SocketData.globalData.socketCountTx,
			socketCountRx : SocketData.globalData.socketCountRx,
			socketCountRxPm : SocketData.globalData.socketCountRxPm,
			socketCountRxPs : SocketData.globalData.socketCountRxPs,
			httpCount : SocketData.globalData.httpCount,
			httpCountPm : SocketData.globalData.httpCountPm,
			httpDataRx : filesize(SocketData.globalData.httpDataRx, {round: 4}),
			httpDataRxPm : SocketData.globalData.httpDataRxPm,
			httpDataRxPs : filesize(SocketData.globalData.httpDataRxPs, {round: 4}),
		}
	}

	static perSecond = () => {
		SocketData.globalData.socketDataRxPs =  SocketData.globalDataBuffer.socketDataRxPs
		SocketData.globalData.socketCountRxPs =  SocketData.globalDataBuffer.socketCountRxPs
		SocketData.globalData.httpDataRxPs = SocketData.globalDataBuffer.httpDataRxPs
		
		SocketData.globalDataBuffer.socketDataRxPs = 0
		SocketData.globalDataBuffer.socketCountRxPs = 0
		SocketData.globalDataBuffer.httpDataRxPs = 0
	}

	static perMinute = (timestamp) => {
		SocketData.globalData.socketCountRxPm =  SocketData.globalDataBuffer.socketCountRxPm
		SocketData.globalDataBuffer.socketCountRxPm = 0

		SocketData.globalData.socketDataRxPm =  SocketData.globalDataBuffer.socketDataRxPm
		SocketData.globalDataBuffer.socketDataRxPm = 0

		SocketData.globalData.httpCountPm = SocketData.globalDataBuffer.httpCountPm
		SocketData.globalDataBuffer.httpCountPm = 0

		SocketData.globalData.httpDataRxPm =  SocketData.globalDataBuffer.httpDataRxPm
		SocketData.globalDataBuffer.httpDataRxPm = 0

		mysql.query(`INSERT INTO global_stats
				(\`timestamp\`, socketDataTx, socketDataRx, socketCountTx, socketCountRx, httpCount, httpDataRx)
			VALUES
				(${timestamp}, ${SocketData.globalData.socketDataTxPm}, ${SocketData.globalData.socketDataRxPm}, ${SocketData.globalData.socketCountTxPm}, ${SocketData.globalData.socketCountRxPm}, ${SocketData.globalData.httpCountPm},
				${SocketData.globalData.httpDataRxPm})
			ON DUPLICATE KEY UPDATE
				socketDataTx = ${SocketData.globalData.socketDataTxPm}, socketDataRx = ${SocketData.globalData.socketDataRxPm}, socketCountTx = ${SocketData.globalData.socketCountTxPm}, socketCountRx = ${SocketData.globalData.socketCountRxPm}, httpCount = ${SocketData.globalData.httpCountPm}, httpDataRx = ${SocketData.globalData.httpDataRxPm};`);


		["tda", "tradier", "alpaca", "coinbase"].forEach(service => {
			let msgTypes = service.msgTypes
			
			_.keys(msgTypes).map(k => {
				this.msgTypes[k].dataRxPs = this.msgTypes[k].dataRxPsBuffer
				this.msgTypes[k].countPm = this.msgTypes[k].countPmBuffer
				this.msgTypes[k].dataRxPsBuffer = 0;
				this.msgTypes[k].countPmBuffer = 0;
				//return console.log(k)

				// console.log(`CALL insert_column('${service}_stats' ,'${k}')`)
				// mysql.query(`CALL insert_column('${service}_stats' ,'${k}')`)



			});
		})


	}

	constructor(service) {
		this.service = service;
		//this.msgTypes["socket"] = { status: "idle", connectionTimeStamp: 0, disconnects: 0 }
		setInterval(this.perSecond, 1000)
		setInterval(this.perMinute, 60000)
	}

	data = (type, data) => {
		type = type.toLowerCase()

		if (type.includes("http")) {
			if (!this.msgTypes[type]) {
				this.msgTypes[type] = { count: 0,
					dataRx: 0,
					dataRxPmBuffer: 0,
					dataRxPsBuffer: 0,
					dataRxPm: 0,
					dataRxPs: 0,
					count: 0,
					countPmBuffer: 0,
					countPsBuffer: 0,
					countPm: 0,
					countPs: 0 }
				console.log(`CALL insert_column("${this.service}_stats","${type.replace("/","_")}")`)
				// mysql.query(`CALL insert_column("${this.service}_stats","${type.replace("/","_")}")`)
			}

			this.msgTypes[type].dataRx += data,
			this.msgTypes[type].dataRxPmBuffer += data,
			this.msgTypes[type].dataRxPsBuffer += data,
			this.msgTypes[type].dataRxPm += data,
			this.msgTypes[type].dataRxPs += data,
			this.msgTypes[type].count += 1,
			this.msgTypes[type].countPmBuffer += 1,
			this.msgTypes[type].countPsBuffer += 1,
				
			this.httpCount += 1
			this.httpDataRx += data
			
			this.statsBuffer.httpDataRxPm += data
			this.statsBuffer.httpDataRxPs += data
			this.statsBuffer.httpCountRxPm += data
			this.statsBuffer.httpCountRxPs += data
			
			SocketData.globalData.httpCount += 1;
			SocketData.globalDataBuffer.httpCountPm += 1;
			SocketData.globalDataBuffer.httpCountPs += 1;
			SocketData.globalData.httpDataRx += data;
			SocketData.globalDataBuffer.httpDataRxPm += data;
			SocketData.globalDataBuffer.httpDataRxPs += data;

		} else {
			if (!this.msgTypes[type]) {
				this.msgTypes[type] = {
					count: 0,
					countPm: 0,
					countPs: 0,
					countPsBuffer: 0,
					countPmBuffer: 0,
					dataRx: 0,
					dataRxPm: 0,
					dataRxPs: 0,
					dataRxPmBuffer: 0,
					dataRxPsBuffer: 0,

				}
				
				console.log(`CALL insert_column("${this.service}_stats" ,"${type}")`)
				//setTimeout(function () { mysql.query(`CALL insert_column("${this.service}_stats" ,"${type}")`) },2000)


			}

			this.msgTypes[type].count += 1;
			this.msgTypes[type].dataRx += data;
			this.msgTypes[type].dataRxPmBuffer += data;
			this.msgTypes[type].dataRxPsBuffer += data;
			this.msgTypes[type].countPmBuffer += 1;
			this.msgTypes[type].countPsBuffer += 1;
			
			if (typeof(data) !== "number") {debugger}
			SocketData.globalData.socketCountRx += 1;
			SocketData.globalData.socketDataRx += data;


			SocketData.globalDataBuffer.socketCountRxPs += 1
			SocketData.globalDataBuffer.socketCountRxPm += 1
			SocketData.globalDataBuffer.socketDataRxPm += data
			SocketData.globalDataBuffer.socketDataRxPs += data
			
			this.socketDataRx += data;
			this.socketCountRx += 1
			
			this.statsBuffer.socketDataRxPm += data;
			this.statsBuffer.socketDataRxPs += data;
			this.statsBuffer.socketCountPm += 1;
			this.statsBuffer.socketCountPs += 1;
			
		}

		
	
	}

	log = (type, message) => {
		// if (!this.msgTypes[type]) this.msgTypes[type] = { count: 0, log : []}
		// this.msgTypes[type].count += 1;
		//this.msgTypes[type].log.push(moment().format() + " ::: " + JSON.stringify(data)) ;
		mysql.log('socketData', this.service, type, message)

	}

	setStatus = (data) => {
		this.status = data
		let type = "info"
		//this.msgTypes["socket"].status = data
		if (data == "closed") this.connectionTimeStamp; this.disconnects += 1; type = "warning"
		if (data == "connected") this.connectionTimeStamp = Date.now()
		if (data == "error") this.connectionTimeStamp = Date.now(); type = "error"
		mysql.log('socketStatus',this.service, type ,data)
	}

	perSecond = () => {


		if (this.service == 'tda'){
			//console.log("global",JSON.stringify(SocketData.getGlobalData(), undefined, 4))
			//console.log(this.service,JSON.stringify( this.getStats(), undefined, 4))
		}
		

		this.socketDataRxPs = this.statsBuffer.socketDataRxPs
		this.socketCountPs = this.statsBuffer.socketCountPs 
		this.statsBuffer.socketDataRxPs = 0
		this.statsBuffer.socketCountPs  = 0
		//console.log(this.getStats())
		let msgTypes = this.msgTypes
		_.keys(msgTypes).map(k => {
			this.msgTypes[k].dataRxPs = this.msgTypes[k].dataRxPsBuffer
			this.msgTypes[k].countPs = this.msgTypes[k].countPsBuffer
			this.msgTypes[k].dataRxPsBuffer = 0;
			this.msgTypes[k].countPsBuffer = 0;
			//return console.log(k)
		});
	}

	perMinute = () => {
		if (this.service == 'tda'){
			//console.log("global",JSON.stringify(SocketData.getGlobalData(), undefined, 4))
			//console.log(this.service,JSON.stringify( this.getStats(), undefined, 4))
		}
		
		//console.log(this.getStats())
		let msgTypes = this.msgTypes
		_.keys(msgTypes).map(k => {

			this.msgTypes[k].pm = 0;
			//return console.log(k)
		});
	}



}
	



module.exports = {
	SocketData: SocketData,
	products: products,
	getGlobalData: SocketData.getGlobalData,
	perSecond: SocketData.perSecond,
	perMinute: SocketData.perMinute,
}