const fs = require('fs');
const request = require('request');
const _ = require('lodash')
const moment = require('moment');
const mysql = require('../mysql.js');


var history = []
var currentMinute = { h: 0.0 , l: 0.0, o: 0.0, c: 0.0  }

var account = {}
var positions = []
function getHistory(){
	return history
}

module.exports.status = () => {
	return account
}

module.exports.positions = () => {
	return account[0].securitiesAccount.positions
}

module.exports.tick = (acc) =>{
	account = acc
	if (history.length === 0) {
		history.push({
			timestamp : Date.now() - (Date.now() % 60000),
			liquidationValue : {h: account[0].securitiesAccount.currentBalances.liquidationValue, l: account[0].securitiesAccount.currentBalances.liquidationValue , o: account[0].securitiesAccount.currentBalances.liquidationValue, c: account[0].securitiesAccount.currentBalances.liquidationValue},
			longMarketValue : {h: account[0].securitiesAccount.currentBalances.longMarketValue, l: account[0].securitiesAccount.currentBalances.longMarketValue , o: account[0].securitiesAccount.currentBalances.longMarketValue, c: account[0].securitiesAccount.currentBalances.longMarketValue},
			shortMarketValue : {h: account[0].securitiesAccount.currentBalances.shortMarketValue, l: account[0].securitiesAccount.currentBalances.shortMarketValue , o: account[0].securitiesAccount.currentBalances.shortMarketValue, c: account[0].securitiesAccount.currentBalances.shortMarketValue},
			availableFunds : {h: account[0].securitiesAccount.currentBalances.availableFunds, l: account[0].securitiesAccount.currentBalances.availableFunds , o: account[0].securitiesAccount.currentBalances.availableFunds, c: account[0].securitiesAccount.currentBalances.availableFunds},
			availableFundsNonMarginableTrade : {h: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade, l: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade , o: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade, c: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade},
			buyingPower : {h: account[0].securitiesAccount.currentBalances.buyingPower, l: account[0].securitiesAccount.currentBalances.buyingPower , o: account[0].securitiesAccount.currentBalances.buyingPower, c: account[0].securitiesAccount.currentBalances.buyingPower},
			buyingPowerNonMarginableTrade : {h: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade, l: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade , o: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade, c: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade},
			dayTradingBuyingPower : {h: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower, l: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower , o: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower, c: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower},
			equity : {h: account[0].securitiesAccount.currentBalances.equity, l: account[0].securitiesAccount.currentBalances.equity , o: account[0].securitiesAccount.currentBalances.equity, c: account[0].securitiesAccount.currentBalances.equity},
			equityPercentage : {h: account[0].securitiesAccount.currentBalances.equityPercentage, l: account[0].securitiesAccount.currentBalances.equityPercentage , o: account[0].securitiesAccount.currentBalances.equityPercentage, c: account[0].securitiesAccount.currentBalances.equityPercentage},
			longMarginValue : {h: account[0].securitiesAccount.currentBalances.longMarginValue, l: account[0].securitiesAccount.currentBalances.longMarginValue , o: account[0].securitiesAccount.currentBalances.longMarginValue, c: account[0].securitiesAccount.currentBalances.longMarginValue},
			maintenanceCall : {h: account[0].securitiesAccount.currentBalances.maintenanceCall, l: account[0].securitiesAccount.currentBalances.maintenanceCall , o: account[0].securitiesAccount.currentBalances.maintenanceCall, c: account[0].securitiesAccount.currentBalances.maintenanceCall},
			maintenanceRequirement : {h: account[0].securitiesAccount.currentBalances.maintenanceRequirement, l: account[0].securitiesAccount.currentBalances.maintenanceRequirement , o: account[0].securitiesAccount.currentBalances.maintenanceRequirement, c: account[0].securitiesAccount.currentBalances.maintenanceRequirement},
			marginBalance : {h: account[0].securitiesAccount.currentBalances.marginBalance, l: account[0].securitiesAccount.currentBalances.marginBalance , o: account[0].securitiesAccount.currentBalances.marginBalance, c: account[0].securitiesAccount.currentBalances.marginBalance},
			regTCall : {h: account[0].securitiesAccount.currentBalances.regTCall, l: account[0].securitiesAccount.currentBalances.regTCall , o: account[0].securitiesAccount.currentBalances.regTCall, c: account[0].securitiesAccount.currentBalances.regTCall},
			shortBalance : {h: account[0].securitiesAccount.currentBalances.shortBalance, l: account[0].securitiesAccount.currentBalances.shortBalance , o: account[0].securitiesAccount.currentBalances.shortBalance, c: account[0].securitiesAccount.currentBalances.shortBalance},
			shortMarginValue : {h: account[0].securitiesAccount.currentBalances.shortMarginValue, l: account[0].securitiesAccount.currentBalances.shortMarginValue , o: account[0].securitiesAccount.currentBalances.shortMarginValue, c: account[0].securitiesAccount.currentBalances.shortMarginValue},
			shortOptionMarketValue : {h: account[0].securitiesAccount.currentBalances.shortOptionMarketValue, l: account[0].securitiesAccount.currentBalances.shortOptionMarketValue , o: account[0].securitiesAccount.currentBalances.shortOptionMarketValue, c: account[0].securitiesAccount.currentBalances.shortOptionMarketValue},
			
		})
	}
	else if (history[history.length -1].timestamp < Date.now() - (Date.now() % 60000) )
	{	

		_.keys(history[history.length -1]).map(e => {
			history[history.length -1][e]["c"] = account[e];
			//console.log(`Setting ${e} close for ${Date.now() - (Date.now() % 60000)} to ${account[e]}` )
		})

		mysql.query(`INSERT INTO  account
		(timestamp,
		liquidationValue,
		longMarketValue,
		shortMarketValue,
		availableFunds,
		availableFundsNonMarginableTrade,
		buyingPower,
		buyingPowerNonMarginableTrade,
		dayTradingBuyingPower,
		equity,
		equityPercentage,
		longMarginValue,
		maintenanceCall,
		maintenanceRequirement,
		marginBalance,
		regTCall,
		shortBalance,
		shortMarginValue,
		shortOptionMarketValue)
		VALUES
		(
		${history[history.length -1].timestamp},
		${account[0].securitiesAccount.currentBalances.liquidationValue},
		${account[0].securitiesAccount.currentBalances.longMarketValue},
		${account[0].securitiesAccount.currentBalances.shortMarketValue},
		${account[0].securitiesAccount.currentBalances.availableFunds},
		${account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade},
		${account[0].securitiesAccount.currentBalances.buyingPower},
		${account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade},
		${account[0].securitiesAccount.currentBalances.dayTradingBuyingPower},
		${account[0].securitiesAccount.currentBalances.equity},
		${account[0].securitiesAccount.currentBalances.equityPercentage},
		${account[0].securitiesAccount.currentBalances.longMarginValue},
		${account[0].securitiesAccount.currentBalances.maintenanceCall},
		${account[0].securitiesAccount.currentBalances.maintenanceRequirement},
		${account[0].securitiesAccount.currentBalances.marginBalance},
		${account[0].securitiesAccount.currentBalances.regTCall},
		${account[0].securitiesAccount.currentBalances.shortBalance},
		${account[0].securitiesAccount.currentBalances.shortMarginValue},
		${account[0].securitiesAccount.currentBalances.shortOptionMarketValue}
		)`)

		history.push({
			timestamp : Date.now() - (Date.now() % 60000),
			liquidationValue : {h: account[0].securitiesAccount.currentBalances.liquidationValue, l: account[0].securitiesAccount.currentBalances.liquidationValue , o: account[0].securitiesAccount.currentBalances.liquidationValue, c: account[0].securitiesAccount.currentBalances.liquidationValue},
			longMarketValue : {h: account[0].securitiesAccount.currentBalances.longMarketValue, l: account[0].securitiesAccount.currentBalances.longMarketValue , o: account[0].securitiesAccount.currentBalances.longMarketValue, c: account[0].securitiesAccount.currentBalances.longMarketValue},
			shortMarketValue : {h: account[0].securitiesAccount.currentBalances.shortMarketValue, l: account[0].securitiesAccount.currentBalances.shortMarketValue , o: account[0].securitiesAccount.currentBalances.shortMarketValue, c: account[0].securitiesAccount.currentBalances.shortMarketValue},
			availableFunds : {h: account[0].securitiesAccount.currentBalances.availableFunds, l: account[0].securitiesAccount.currentBalances.availableFunds , o: account[0].securitiesAccount.currentBalances.availableFunds, c: account[0].securitiesAccount.currentBalances.availableFunds},
			availableFundsNonMarginableTrade : {h: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade, l: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade , o: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade, c: account[0].securitiesAccount.currentBalances.availableFundsNonMarginableTrade},
			buyingPower : {h: account[0].securitiesAccount.currentBalances.buyingPower, l: account[0].securitiesAccount.currentBalances.buyingPower , o: account[0].securitiesAccount.currentBalances.buyingPower, c: account[0].securitiesAccount.currentBalances.buyingPower},
			buyingPowerNonMarginableTrade : {h: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade, l: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade , o: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade, c: account[0].securitiesAccount.currentBalances.buyingPowerNonMarginableTrade},
			dayTradingBuyingPower : {h: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower, l: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower , o: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower, c: account[0].securitiesAccount.currentBalances.dayTradingBuyingPower},
			equity : {h: account[0].securitiesAccount.currentBalances.equity, l: account[0].securitiesAccount.currentBalances.equity , o: account[0].securitiesAccount.currentBalances.equity, c: account[0].securitiesAccount.currentBalances.equity},
			equityPercentage : {h: account[0].securitiesAccount.currentBalances.equityPercentage, l: account[0].securitiesAccount.currentBalances.equityPercentage , o: account[0].securitiesAccount.currentBalances.equityPercentage, c: account[0].securitiesAccount.currentBalances.equityPercentage},
			longMarginValue : {h: account[0].securitiesAccount.currentBalances.longMarginValue, l: account[0].securitiesAccount.currentBalances.longMarginValue , o: account[0].securitiesAccount.currentBalances.longMarginValue, c: account[0].securitiesAccount.currentBalances.longMarginValue},
			maintenanceCall : {h: account[0].securitiesAccount.currentBalances.maintenanceCall, l: account[0].securitiesAccount.currentBalances.maintenanceCall , o: account[0].securitiesAccount.currentBalances.maintenanceCall, c: account[0].securitiesAccount.currentBalances.maintenanceCall},
			maintenanceRequirement : {h: account[0].securitiesAccount.currentBalances.maintenanceRequirement, l: account[0].securitiesAccount.currentBalances.maintenanceRequirement , o: account[0].securitiesAccount.currentBalances.maintenanceRequirement, c: account[0].securitiesAccount.currentBalances.maintenanceRequirement},
			marginBalance : {h: account[0].securitiesAccount.currentBalances.marginBalance, l: account[0].securitiesAccount.currentBalances.marginBalance , o: account[0].securitiesAccount.currentBalances.marginBalance, c: account[0].securitiesAccount.currentBalances.marginBalance},
			regTCall : {h: account[0].securitiesAccount.currentBalances.regTCall, l: account[0].securitiesAccount.currentBalances.regTCall , o: account[0].securitiesAccount.currentBalances.regTCall, c: account[0].securitiesAccount.currentBalances.regTCall},
			shortBalance : {h: account[0].securitiesAccount.currentBalances.shortBalance, l: account[0].securitiesAccount.currentBalances.shortBalance , o: account[0].securitiesAccount.currentBalances.shortBalance, c: account[0].securitiesAccount.currentBalances.shortBalance},
			shortMarginValue : {h: account[0].securitiesAccount.currentBalances.shortMarginValue, l: account[0].securitiesAccount.currentBalances.shortMarginValue , o: account[0].securitiesAccount.currentBalances.shortMarginValue, c: account[0].securitiesAccount.currentBalances.shortMarginValue},
			shortOptionMarketValue : {h: account[0].securitiesAccount.currentBalances.shortOptionMarketValue, l: account[0].securitiesAccount.currentBalances.shortOptionMarketValue , o: account[0].securitiesAccount.currentBalances.shortOptionMarketValue, c: account[0].securitiesAccount.currentBalances.shortOptionMarketValue},
		})
	}
	else{
		_.keys(history[history.length -1]).map(e => {
			if (	positions = acc[0].securitiesAccount[e] < history[history.length -1][e]["l"]) {history[history.length -1][e]["l"] = 	positions = acc[0].securitiesAccount[e];  } 
			if (	positions = acc[0].securitiesAccount[e] > history[history.length -1][e]["h"]) {history[history.length -1][e]["h"] = 	positions = acc[0].securitiesAccount[e];  } 
		})
	}
	//console.log(history)
	//console.log(history[history.length -1].liquidationValue )
}




