const moment = require('moment');
const express = require('express');
const app = require("express")();
const http = require('http');
var serveStatic = require('serve-static')
const mysql = require('./mysql.js');
mysql.init()

const fs = require('fs');
const _ = require('lodash');


const tda = require('./tda/tda.js')
const tdaWatchlists = require('./tda/watchlists.js')
const tradier = require('./tradier/tradier.js')
const alpaca = require('./alpaca/alpaca.js')
const coinbase = require('./coinbase/coinbase')

const productClass = require("./productClass.js").Product;

const monitor = require("./monitor.js");
const clientConnection = require('./clientconnection.js');
//const mysql = require("./mysql.js");
//const reddit = require('./reddit/reddit')
//const fetch = require('node-fetch');


tda.load()
tradier.load()
alpaca.load()
coinbase.load()

monitor.load()
clientConnection.load()

app.use(function(req, res, next) {
     res.header("Access-Control-Allow-Origin", "*");
     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
     next();
});

//app.use('/' ,express.static('../' ) );

//app.use("/", express.static(path.join(__dirname, '/var/www/charelskiel.dev/')));

//GET home route
app.get('/accountinfo', (req, res) => {
     let access_token = JSON.parse(fs.readFileSync("./auth/access_token.json", (err) => { if (err) console.error(err); }))
     let refresh_token = JSON.parse(fs.readFileSync("./auth/refresh_token.json", (err) => { if (err) console.error(err); }))
     let account_info = JSON.parse(fs.readFileSync("./auth/account_info.json", (err) => { if (err) console.error(err); }))
     res.send(JSON.stringify({
          test: "OK",
          refresh_token: refresh_token,
          access_token: access_token,
          account_info: account_info,
          codeLastUpdated: moment(access_token.updated_on).fromNow(),
          encoded_code: encodeURIComponent(refresh_token.code),
          principals: JSON.parse(fs.readFileSync("./auth/user_principals.json", (err) => { if (err) console.error(err); }))
     }, undefined, 4));
});

//GET home route
app.get('/tda_callback', (req, res) => {
     let j = JSON.parse(fs.readFileSync("./auth/refresh_token.json", (err) => { if (err) console.error(err); }))
     j.code = decodeURIComponent(req.query.code)
     j.updated_on = Date.now()
     fs.writeFileSync("./auth/refresh_token.json", JSON.stringify(j, undefined, 4), (err) => { if (err) throw err; })

     res.send(JSON.stringify(j, undefined, 4));

});


app.get('/pricehistory', (req, res) => {
     tda.priceHistory(req.query).then(data => {
          // console.log(`Sucuess:`, data)
          fs.writeFileSync(`./data/${req.query.symbol}.json`, JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          // console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/chains', (req, res) => {
     tda.chains(req.query.symbol).then(data => {
          // console.log(`Sucuess:`, data)
          fs.writeFileSync(`./data/${req.query.symbol}_chain.json`, JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          // console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/watchlist', (req, res) => {
     tda.watchlists().then(data => {
          // console.log(`Sucuess:`, data)
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          // console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/state', (req, res) => {
     monitor.state().then(data => {
          // console.log(`Sucuess:`, data)
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          // console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/status', (req, res) => {
     res.send(JSON.stringify(tda.status(), undefined, 4));
});

app.get('/accountStatus', (req, res) => {
     // console.log(tda.account.status());
     res.send(JSON.stringify(tda.status(), undefined, 4));
});

app.get('/getWatchlists', (req, res) => {
     res.send(JSON.stringify(tdaWatchlists.watchlists, undefined, 4));
     
});

app.get('/reddit', (req, res) => {
     // console.log(req.path)
     // console.log(req.query)
     res.send("Hello Reddit.")
});

app.get('/data', (req, res) => {
     res.send(JSON.stringify(monitor.getDataStats(), undefined, 4));
});

http.createServer(
     // {
     // key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
     // cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
     // }
      app)
     .listen(8000)
     

