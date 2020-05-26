
var moment = require('moment');
const tda =  require('./tda/tda.js')
// var alpaca = require('./alpaca/alpaca.js')
// var coinbase = require('./coinbase/coinbase')
//var reddit = require('./reddit/reddit')
//import * as Tda from './tda_auth.js'

//alpaca.refresh()
const fetch = require('node-fetch');
const app = require('express')();
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(function(req, res, next) {
     res.header("Access-Control-Allow-Origin", "*");
     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
     //console.log(req.body);
     //console.log(req.query);

     next();
});
//app.use(bodyParser.urlencoded({ extended: true }));
tda.load()
//alpaca.collectData()
var _ = require('lodash');
// var j = JSON.parse(fs.readFileSync("./data/ROKU_chain.json", (err) => { if (err) console.error(err); }))
// debugger
// [j.callExpDateMap, j.putExpDateMap].map(call => _.values(call).map(_week => {
//      //console.log((_week))
//      _.values(_week).map(_strike => {
//           _strike.map(_price => {
//                //console.log(price.bid)

//                //console.log(`${_week},${(_strike)},${_price.description}`)
//                console.log(`${_price.description}`)
//           })
//      })
// })
// )


var mysql = require('mysql');
var connection = mysql.createConnection({
     host: '360tv.net',
     user: 'root',
     password: 'Alabama!9044013083828789',
     database: 'marketmanager'
});

//GET home route
app.get('/accountinfo', (req, res,next) => {
     let access_token = JSON.parse(fs.readFileSync("./tda/access_token.json", (err) => { if (err) console.error(err); }))
     let refresh_token = JSON.parse(fs.readFileSync("./tda/refresh_token.json", (err) => { if (err) console.error(err); }))
     let account_info = JSON.parse(fs.readFileSync("./tda/account_info.json", (err) => { if (err) console.error(err); }))
     //JSON.parse(fs.readFileSync("./tda/account_info.json", (err) => { if (err) console.error(err); }))
     res.send(JSON.stringify({
          test: "OK",
          refresh_token: refresh_token,
          access_token: access_token,
          account_info: account_info,
          codeLastUpdated: moment(access_token.updated_on).fromNow(),
          encoded_code: encodeURIComponent(refresh_token.code),
          principals: JSON.parse(fs.readFileSync("./tda/user_principals.json", (err) => { if (err) console.error(err); }))

     }, undefined, 4));
});

//GET home route
app.get('/tda_callback', (req, res,next) => {
     let j = JSON.parse(fs.readFileSync("./tda/refresh_token.json", (err) => { if (err) console.error(err); }))
     j.code = decodeURIComponent(req.query.code)
     j.updated_on = Date.now()
     fs.writeFileSync("./tda/refresh_token.json", JSON.stringify(j, undefined, 4), (err) => { if (err) throw err; })

     res.send(JSON.stringify(j, undefined, 4));

});


app.get('/pricehistory', (req, res) => {
     tda.priceHistory(req.query).then((data) => {
          console.log(`Sucuess: ${data}`)
          fs.writeFileSync(`./data/${req.query.symbol}.json`, JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
          res.send(JSON.stringify(data, undefined, 4));
     }, (error) => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/chains', (req, res) => {
     tda.chains(req.query.symbol).then((data) => {
          console.log(`Sucuess: ${data}`)
          fs.writeFileSync(`./data/${req.query.symbol}_chain.json`, JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
          res.send(JSON.stringify(data, undefined, 4));
     }, (error) => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/watchlist', (req, res) => {
     tda.watchlists().then((data) => {
          console.log(`Sucuess: ${data}`)
          res.send(JSON.stringify(data, undefined, 4));
     }, (error) => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/state', (req, res) => {
     tda.state().then((data) => {
          console.log(`Sucuess: ${data}`)
          res.send(JSON.stringify(data, undefined, 4));
     }, (error) => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/status', (req, res) => {
     tda.status().then((data) => {
          console.log(`Sucuess: ${data}`)
          res.send(JSON.stringify(data, undefined, 4));
     }, (error) => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/getWatchlists', (req, res) => {
     tda.getWatchlists().then((data) => {
          console.log(`Sucuess: ${data}`)
          console.log(data)
          res.send(JSON.stringify(data, undefined, 4));
     }, (error) => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/reddit', (req, res) => {
     console.log(req.path)
     console.log(req.query)
     res.send("Hello Reddit.")
});



// // we will pass our 'app' to 'https' server
https.createServer({
     key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
     cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
}, app)
     .listen(8000);

// //console.log(tda.keys.Authorization)

//tda.refresh()
