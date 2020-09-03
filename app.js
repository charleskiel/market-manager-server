
var moment = require('moment');
const tda =  require('./tda/tda.js')
//var alpaca = require('./alpaca/alpaca.js')
//var coinbase = require('./coinbase/coinbase')
//var reddit = require('./reddit/reddit')

//alpaca.refresh()
const fetch = require('node-fetch');
const app = require('express')();
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(function(req, res, next) {
     res.header("Access-Control-Allow-Origin", "*");
     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
     next();
});
//app.use(bodyParser.urlencoded({ extended: true }));
//tda.load()
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




//GET home route
app.get('/accountinfo', (req, res,next) => {
     let access_token = JSON.parse(fs.readFileSync("./auth/access_token.json", (err) => { if (err) console.error(err); }))
     let refresh_token = JSON.parse(fs.readFileSync("./auth/refresh_token.json", (err) => { if (err) console.error(err); }))
     let account_info = JSON.parse(fs.readFileSync("./auth/account_info.json", (err) => { if (err) console.error(err); }))
     //JSON.parse(fs.readFileSync("./auth/account_info.json", (err) => { if (err) console.error(err); }))
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
app.get('/tda_callback', (req, res,next) => {
     let j = JSON.parse(fs.readFileSync("./auth/refresh_token.json", (err) => { if (err) console.error(err); }))
     j.code = decodeURIComponent(req.query.code)
     j.updated_on = Date.now()
     fs.writeFileSync("./auth/refresh_token.json", JSON.stringify(j, undefined, 4), (err) => { if (err) throw err; })

     res.send(JSON.stringify(j, undefined, 4));

});


app.get('/pricehistory', (req, res) => {
     tda.priceHistory(req.query).then(data => {
          console.log(`Sucuess: ${data}`)
          fs.writeFileSync(`./data/${req.query.symbol}.json`, JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/chains', (req, res) => {
     tda.chains(req.query.symbol).then(data => {
          console.log(`Sucuess: ${data}`)
          fs.writeFileSync(`./data/${req.query.symbol}_chain.json`, JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/watchlist', (req, res) => {
     tda.watchlists().then(data => {
          console.log(`Sucuess: ${data}`)
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/state', (req, res) => {
     tda.state().then(data => {
          console.log(`Sucuess: ${data}`)
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/status', (req, res) => {
     res.send(JSON.stringify(tda.status(), undefined, 4));
});

app.get('/accountStatus', (req, res) => {
     console.log(tda.accountStatus());
     res.send(JSON.stringify(tda.status(), undefined, 4));
});

app.get('/getWatchlists', (req, res) => {
     tda.getWatchlists().then(data => {
          console.log(`Sucuess:`, data)
          res.send(JSON.stringify(data, undefined, 4));
     }, error => {
          console.log(`${error}`)
          res.send("{ERROR:ERROR}")
     })
});

app.get('/reddit', (req, res) => {
     console.log(req.path)
     console.log(req.query)
     res.send("Hello Reddit.")
});




app.get('/mm', (req, res) => {
     console.log(req.path)
     console.log(req.query)
     res.sendFile(path.join(__dirname, 'react-mm/build/index.html'))
});



// // we will pass our 'app' to 'https' server
https.createServer({
     key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
     cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
}, app)
     .listen(8000);

// //console.log(tda.keys.Authorization)

//tda.refresh()







/*
This is the same one found in http://www.espenhaug.com/black_scholes.html
but written with proper indentation and a === instead of == because it's
faster, and it doesn't declare 5 useless variables (although if you really
want to do it to have more elegant code I left a commented CND function in
the end)
*/


function black_scholes(call,S,X,r,v,t) { 
     // call = Boolean (to calc call, call=True, put: call=false)
     // S = stock prics, X = strike price, r = no-risk interest rate
     // v = volitility (1 std dev of S for (1 yr? 1 month?, you pick)
     // t = time to maturity
      
     // define some temp vars, to minimize function calls
       var sqt = Math.sqrt(t);
       var Nd2;  //N(d2), used often
       var nd1;  //n(d1), also used often
       var ert;  //e(-rt), ditto
       var delta;  //The delta of the option
      
       d1 = (Math.log(S/X) + r*t)/(v*sqt) + 0.5*(v*sqt);
       d2 = d1 - (v*sqt);
      
       if (call === "call") {
         delta = N(d1);
         Nd2 = N(d2);
       } else { //put
         delta = -N(-d1);
         Nd2 = -N(-d2);
       }
      
       ert = Math.exp(-r*t);
       nd1 = ndist(d1);
      
       gamma = nd1/(S*v*sqt);
       vega = S*sqt*nd1;
       theta = -(S*v*nd1)/(2*sqt) - r*X*ert*Nd2;
       rho = X*t*ert*Nd2;
      
       return ( S*delta-X*ert *Nd2);
      
     } //end of black_scholes
     function N(z) {
          b1 =  0.31938153;
          b2 = -0.356563782;
          b3 =  1.781477937;
          b4 = -1.821255978;
          b5 =  1.330274429;
          p  =  0.2316419;
          c2 =  0.3989423;
          a=Math.abs(z);
          if (a>6.0) {return 1.0;} 
          t = 1.0/(1.0+a*p);
          b = c2*Math.exp((-z)*(z/2.0));
          n = ((((b5*t+b4)*t+b3)*t+b2)*t+b1)*t;
          n = 1.0-b*n;
          if (z < 0.0) {n = 1.0 - n;}
          return n;
        }  

        function ndist(z) {
          return (1.0/(Math.sqrt(2*Math.PI)))*Math.exp(-0.5*z);
          //??  Math.exp(-0.5*z*z)
        }
         
function BlackScholes(PutCallFlag, S, X, T, r, v) {
     //return black_scholes(PutCallFlag,S,X,r,v,T)
	var d1 = (Math.log(S / X) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
	var d2 = d1 - v * Math.sqrt(T);
	if (PutCallFlag === "call") {
		return ( S * CND(d1)-X * Math.exp(-r * T) * CND(d2) );
	} else {
		return ( X * Math.exp(-r * T) * CND(-d2) - S * CND(-d1) );
	}
}

/* The cummulative Normal distribution function: */
function CND(x){
	if(x < 0) {
		return ( 1-CND(-x) );
	} else {
		k = 1 / (1 + .2316419 * x);
		return ( 1 - Math.exp(-x * x / 2)/ Math.sqrt(2*Math.PI) * k * (.31938153 + k * (-.356563782 + k * (1.781477937 + k * (-1.821255978 + k * 1.330274429)))) );
	}
}

//With the "a" variables
// function CND(x){
// 	var a1 = .31938153,
// 	a2 = -.356563782,
// 	a3 = 1.781477937,
// 	a4 = -1.821255978,
// 	a5 = 1.330274429;
// 	if(x<0.0) {
// 		return 1-CND(-x);
// 	} else {
// 		k = 1.0 / (1 + 0.2316419 * x);
// 		return ( 1 - Math.exp(-x * x / 2	)/ Math.sqrt(2*Math.PI) * k * (a1 + k * (a2 + k * (a3 + k * (a4 + k * a5)))) );
// 	}
// }

function test() {
	const chain = JSON.parse(fs.readFileSync("./data/ROKU_chain.json"));
	let chains = [chain.callExpDateMap,chain.putExpDateMap]
	
	// chains.callExpDateMap.map(x => {
		
	// 	x.s.v
	// 	//PutCallFlag: Either "put" or "call"
	// 	//S: Stock Price
	 	let S = chain.underlying.mark
	// 	//X: Strike Price
	// 	let X = 180
	// 	//T: Time to expiration (in years)
	// 	let T = (1/365) * 20
	// 	//r: Risk-free rate
	 	let r = 0.74
	// 	//v: Volatility
	// 	console.log(chains.symbol)
	// 	console.log(chains.underlying.mark)
	// 	console.log(BlackScholes("call", S,X,T,r,v))
	// })


	//console.log(_.values(chain.callExpDateMap["2020-05-22:3"]))
	chains.map(chain =>{
		return _.map(chain, (exp , x)=> {
			//console.log("/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*")
			//console.log(chain)
			//console.log(exp)
			//console.log(x)
			return _.values(exp).map( strike => {
				//console.log("==========================")
				//console.log(strike[0].description)
				//console.log("Last Price $",strike[0].mark)
				//console.log("Volitility",strike[0].volatility /100)
				//console.log("Days",moment(strike[0].expirationDate).diff(moment(Date.now()).add(-1.5, "days"), 'days', true) ,moment(strike[0].expirationDate).diff(moment(Date.now()), 'years', true) )
                    
				if (strike[0].volatility !== "NaN"){
                         //console.log("Calculated Price" , BlackScholes(
                              strike[0].putCall.toLowerCase(),
                              S,
                              strike[0].strikePrice,
                              moment(strike[0].expirationDate).diff(moment(Date.now()).add(-3, "days") ,'years',true),
                              0,
                              strike[0].volatility/100
                         ))
                      //if (strike[0].description === "ROKU Sep 18 2020 210 Call") {debugger}    
                    }
                    else
                    {
                         //debugger
                         }
				})
		})
	})
}	

test()