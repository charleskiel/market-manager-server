
var moment = require('moment');
var tda = require('./tda/tda_auth.js')
//import * as Tda from './tda_auth.js'

const fetch = require('node-fetch');
const app = require('express')();
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));


var mysql = require('mysql');
var connection = mysql.createConnection({
     host: '360tv.net',
     user: 'root',
     password: 'Alabama!9044013083828789',
     database: 'marketmanager'
});

// connection.connect(function (err) {
//      if (err) {
//           console.error('error connecting: ' + err.stack);
//           return;
//      }

//      console.log('connected as id ' + connection.threadId);
// });


//GET home route
app.get('/', (req, res) => {
     let access_token = JSON.parse(fs.readFileSync("./tda/access_token.json", (err) => { if (err) console.error(err); }))
     let refresh_token = JSON.parse(fs.readFileSync("./tda/refresh_token.json", (err) => { if (err) console.error(err); }))

     res.send(JSON.stringify({
          test: "OK",
          refresh_token: refresh_token,
          access_token: access_token,
          codeLastUpdated: moment(access_token.updated_on).fromNow(),
          encoded_code: encodeURIComponent(refresh_token.code)

     }, undefined, 4));
});

//GET home route
app.get('/tda_callback', (req, res) => {
     console.log(req.body);
     console.log(req.query);
     
     let j = JSON.parse(fs.readFileSync("./tda/refresh_token.json", (err) => { if (err) console.error(err); }))
     j.code = decodeURIComponent(req.query.code)
     j.updated_on = Date.now()
     fs.writeFile("./tda/refresh_token.json", JSON.stringify(j, undefined, 4), (err) => { if (err) throw err; })
     
     res.send(JSON.stringify(j, undefined, 4));

});

//GET home route
app.get('/pricehistory', (req, res) => {
     //console.log(req.body);
     //console.log(req.query);

     

     tda.priceHistory(req.query.symbol).then((data) => {
          console.log(`Sucuess: ${data}`)
          
          //let data = JSON.parse(fs.readFileSync("./tda/refresh_token.json", (err) => { if (err) console.error(err); }))
          fs.writeFile(`./data/${req.query.symbol}.json`, JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
          
          res.send(JSON.stringify(data, undefined, 4));
     
     
     }, (error) => {
               console.log(`${error}`)
               res.send("{ERROR:ERROR}")
     })



});

// we will pass our 'app' to 'https' server
https.createServer({
     key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
     cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
}, app)
     .listen(8000);

//console.log(tda.keys.Authorization)


function test() {

     fetch('https://api.tdameritrade.com/v1/accounts/686093498', {
          method: 'post',
          headers: { Authorization: tda.keys.access_token },
          body: JSON.stringify({ fields: "positions" })
     })
          .then(res => res.json()) // expecting a json response
          .then(json => console.log(json));

}
tda.refresh()

//console.log(test())