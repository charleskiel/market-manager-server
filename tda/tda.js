const fs = require('fs');
const request = require('request');
const _ = require('lodash')
const moment = require('moment');
const WebSocket = require('websocket').w3cwebsocket;
var state = {}
var stocks = {}
let refreshTokenInfo =  JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
let access_token =  JSON.parse(fs.readFileSync('./tda/access_token.json'))
let accountInfo =  JSON.parse(fs.readFileSync('./tda/account_info.json'))
let principals = JSON.parse(fs.readFileSync('./tda/user_principals.json'))
//function principals(){ JSON.parse(fs.readFileSync('./tda/user_principals.json'), (err) => { if (err) console.error(err); })}

jsonToQueryString = (json) => {return Object.keys(json).map(function (key) {return (encodeURIComponent(key) +"=" +encodeURIComponent(json[key]));}).join("&");};


var ws = new WebSocket("wss://streamer-ws.tdameritrade.com/ws")

module.exports.load = function() { 
    module.exports.refresh()
    
    ws.onopen = function () {
        //console.log(principals.accounts);
        console.log("Connected to Server");
        
        let login = JSON.stringify({
            requests: [
                {
                    service: "ADMIN",
                    command: "LOGIN",
                    requestid: 0,
                    account: principals.accounts[0].accountId,
                    source: principals.streamerInfo.appId,
                    parameters: {
                        credential: jsonToQueryString(credentials()),
                        token: principals.streamerInfo.token,
                        version: "1.0",
                        qoslevel: 0,
                    },
                },
            ],
        });
        //console.log(login)
        ws.send(login);

    }
        // Listen for messages
    ws.onmessage = function (event) {
        console.log('Message from server ', event.data);
        msgRec(JSON.parse(event.data));

        //setState({ packetcount: state.packetcount += 1 })
        //console.log(msg)
    }

    ws.onerror = function(error){
        console.log(error);
    };
    
    ws.onclose = function() {
        console.log('echo-protocol Connection Closed');
    }
    
    //ws.connect("")

}

module.exports.refresh = () => {
    console.log("Validating credientials")
    validatetoken()
    validateprincipals()
}
    
function errorHandler(err, req, res, next){
    res.status(500)
    res.render('error', { error: err })
}


module.exports.priceHistory = (req) => {
    return new Promise((result, error) => {
        //periodType: The type of period to show.Valid values are day, month, year, or ytd(year to date).Default is day.
        //period: The number of periods to show.
        //Example: For a 2 day / 1 min chart, the values would be:
        // period: 2
        // periodType: day
        // frequency: 1
        // frequencyType: min

        // Valid periods by periodType(defaults marked with an asterisk):

        // day: 1, 2, 3, 4, 5, 10 *
        // month: 1 *, 2, 3, 6
        // year: 1 *, 2, 3, 5, 10, 15, 20
        // ytd: 1 *

        let str = ""
        if (req.frequency == "") {
            str = `https://api.tdameritrade.com/v1/marketdata/${req.symbol}/pricehistory?&periodType=&period=1&frequencyType=minute&frequency=1`
        }else{
            str = `https://api.tdameritrade.com/v1/marketdata/${req.symbol}/pricehistory?&periodType=${req.periodType}&period=${req.period}&frequencyType=${req.frequencyType}&frequency=${req.frequency}`
            
        }
        getdata(str)
            .then((fetch) => {result(fetch)})
            .catch((fail) => {error(fail)})
    })
}


module.exports.chains = (symbol) => {
    return new Promise((result,error) =>{
        getdata(`https://api.tdameritrade.com/v1/marketdata/chains?symbol=${symbol}&includeQuotes=TRUE`)
            .then((fetch) => {result(fetch)}).catch((fail) => {error(fail)})
    })
}


module.exports.watchlist = () => {
    return new Promise((result,error) =>{
        getdata(`https://api.tdameritrade.com/v1/accounts/${JSON.parse(fs.readFileSync('./tda/user_principals.json')).accounts[0].accountId }/watchlist`)
            .then((fetch) => {result(fetch)}).catch((fail) => {error(fail)})
    })
}





function getdata(endpoint){
    console.log(endpoint)
    return new Promise((result, fail) => {
        const options = {
            headers: getAuthorizationHeader(),
            url: endpoint,
            method: 'GET',
        };

        request(options, function (error, response, body) {
            if (response.statusCode === 200) {
                if (body != "") {
                
                //console.log(body)
                let j = JSON.parse(body)
                //console.log(j);
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
                        console.log(refreshAccessToken)
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


function validatetoken(){
    console.log("Validating Token")

    const access_token = JSON.parse(fs.readFileSync('./tda/access_token.json'))
    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    
    console.log(`Access code expires ${moment(access_token.created_on + access_token.expires_in).fromNow()}`)
    console.log("=================================================")
    console.log(`Refresh Token updated ${moment(refreshTokenInfo.updated_on).fromNow()}, expires ${moment(refreshTokenInfo.updated_on).add(90, 'days').fromNow()}. No update needed.`)
    
    if (Date.now() >= access_token.created_on + (access_token.expires_in *1000)) {
        console.log("Token appears to be expired... Refreshing");
        refreshAccessToken()
    }
    else {
        console.log(`Access Token OK updated ${moment(access_token.created_on).fromNow()}, expires ${moment(refreshTokenInfo.expires_on).add(90, 'days').fromNow()}.`)
    }
    
}


function validateprincipals(){
    console.log("Validating Pricipals")

    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    const user_principals = JSON.parse(fs.readFileSync('./tda/user_principals.json'))
    
    console.log(`Principals updated ${moment(user_principals.streamerInfo.tokenTimestamp).fromNow()}, expires ${moment(user_principals.tokenExpirationTime).fromNow()}`)
    console.log(moment(user_principals.streamerInfo.tokenTimestamp).format())
    console.log(moment(Date.now()).format())
    console.log(moment(Date.now()).diff(user_principals.streamerInfo.tokenTimestamp, "seconds"))


    if (moment(user_principals.streamerInfo.tokenTimestamp).diff(Date.now()) <= 0) {
        console.log("=================================================")
        console.log("Principals appears to be expired... Refreshing");
        getdata('https://api.tdameritrade.com/v1/userprincipals?fields=streamerSubscriptionKeys%2CstreamerConnectionInfo%2Cpreferences%2CsurrogateIds')

            .then((data) => {
                // 3. now that you have the access token, store it so it persists over multiple instances of the script.
                console.log(data)
                if (data.error == "Invalid ApiKey") {
                    //debugger
                } else if (data.error == "Invalid ApiKey") {
                    //debugger
                } else if (data.error == "invalid_grant") {
                    //debugger
                } else {
                    //debugger
                    fs.writeFileSync("./tda/user_principals.json", JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
                    //console.log(`principals updated. Expires ${moment(user_principals.tokenExpirationTime).fromNow()} `);
                }
                //debugger
            })
            .catch((fail) => { console.log(fail) })
        
        
        

    }
    else {
        console.log(`Principals OK updated ${moment(user_principals.streamerInfo.tokenTimestamp).fromNow()}, expires ${moment(refreshTokenInfo.expires_on).add(90, 'days').fromNow()}.`)
    }
    
}

function refreshAccessToken(){

    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    const accountInfo = JSON.parse(fs.readFileSync('./tda/account_info.json'))
    
    // 1. get refresh token and determine if expired or not.
    // read json file
    // 2. request refreshed token

    const options = {
        url: 'https://api.tdameritrade.com/v1/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: {
            'grant_type': 'refresh_token',
            'access_type': '',
            'refresh_token': (refreshTokenInfo.refresh_token),
            'client_id': (accountInfo.client_id),
        }
    };

    console.log(options.form)
    request(options, function (error, response, body) {

        // 3. now that you have the access token, store it so it persists over multiple instances of the script.
        let data = JSON.parse(body);
        console.log(data)
        if (data.error == "Invalid ApiKey"){
            //debugger
        } else if (data.error == "Invalid ApiKey"){
            //debugger
        } else if (data.error == "invalid_grant"){
            //debugger
        } else
        {
            data.created_on = Date.now();
            data.expires_on = Date.now() + data.expires_in
            
            fs.writeFileSync("./tda/access_token.json", JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
            
            console.log("Access Token updated. Expires in " + data.expires_in + " seconds");
            //debugger
        }
        //debugger
    });

}

function getAuthorizationHeader(){
    const access_token = JSON.parse(fs.readFileSync('./tda/access_token.json'))
    return {
        'Authorization': 'Bearer ' + access_token.access_token
    };
}










///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////        Socket Connection        ///////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////

let rid = 0
function requestid(){
    return (rid = +1);
};

function credentials () {
    
    console.log( JSON.parse(fs.readFileSync('./tda/user_principals.json','utf8'), (err) => { if (err) console.error(err); }))
console.log(principals)
//Fdebugger
    var tokenTimeStampAsDateObj = new Date(
        principals.streamerInfo.tokenTimestamp
    );
    var tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

    return {
        userid: principals.accounts[0].accountId,
        token: principals.streamerInfo.token,
        company: principals.accounts[0].company,
        segment: principals.accounts[0].segment,
        cddomain: principals.accounts[0].accountCdDomainId,
        usergroup: principals.streamerInfo.userGroup,
        accesslevel: principals.streamerInfo.accessLevel,
        authorized: "Y",
        timestamp: tokenTimeStampAsMs,
        appid: principals.streamerInfo.appId,
        acl: principals.streamerInfo.acl,
    };
};




function msgRec(msg){
    if (msg.notify) {
        console.log({heartbeat: msg.notify[0].heartbeat})
        //console.log(msg)
    } else {
        if (msg.data) {
            msg.data.forEach((m) => {
                console.log(m);
                
                switch (m.service) {
                    case "QUOTE":
                        m.content.forEach(eq => equityTick(eq));
                        break;
                    case "ACTIVES_NASDAQ":
                        console.log("Nasdaq Activies")
                        //console.log(m)
                        var split = m.content[0]["1"].split(";")
                        var o = {
                        "timestamp" : m.timestamp,
                        "ID:" : split[0],
                        "sampleDuration" : split[1],
                        "Start Time" : split[2],
                        "Display Time" : split[3],
                        "GroupNumber" : split[4],
                        "groups" : []}
                        split = (split[6].split(":"))
                        o.totalVolume = (split[0])
                        o.groupcount = split[1]
                        for (let i = 3; i < split.length; i += 3) {
                            if (!stocks[split[i]]) stocks[split[i]] = {key : split[i]}
                            o.groups.push({symbol: split[i], volume: split[i+1], priceChange: split[i+2]}) 
                            //console.log(`${split[i]} - ${split[i+1]} - ${split[i+2]}`) 
                        }
                        console.log(o)
                        //this.setState({ACTIVES_NASDAQ : o})
                        
                        //console.log(this.state.ACTIVES_NASDAQ)
                    
                    case "ACTIVES_NYSE":
                        console.log("NYSE Activies")
                        //console.log(m)
                        var split = m.content[0]["1"].split(";")
                        var o = {
                        "timestamp" : m.timestamp,
                        "ID:" : split[0],
                        "sampleDuration" : split[1],
                        "Start Time" : split[2],
                        "Display Time" : split[3],
                        "GroupNumber" : split[4],
                        "groups" : []}
                        split = (split[6].split(":"))
                        o.totalVolume = (split[0])
                        o.groupcount = split[1]
                        for (let i = 3; i < split.length; i += 3) {
                            if (!stocks[split[i]]) stocks[split[i]] = {key : split[i]}
                            o.groups.push({symbol: split[i], volume: split[i+1], priceChange: split[i+2]}) 
                            //console.log(`${split[i]} - ${split[i+1]} - ${split[i+2]}`) 
                            
                        }
                        this.setState({ACTIVES_NYSE : o})
                        
                        //console.log(this.state.ACTIVES_NYSE)
                        break;
                    case "ACTIVES_OPTIONS":
                        console.log("OPTIONS Activies")
                        //console.log(m)
                        var split = m.content[0]["1"].split(";")
                        var o = {
                        "timestamp" : m.timestamp,
                        "ID:" : split[0],
                        "sampleDuration" : split[1],
                        "Start Time" : split[2],
                        "Display Time" : split[3],
                        "GroupNumber" : split[4],
                        "groups" : []}

                        split = (split[6].split(":"))
                        o.totalVolume = (split[3])
                        o.groupcount = split[1]

                        for (let i = 3; i < split.length; i += 4) {
                            //if (!this.state[split[i]]) this.tickerSubscribe([split[i]])
                            o.groups.push({symbol: split[i], name: split[i+1], volume: split[i+2], percentChange: split[i+3]}) 
                        }
                        //this.setState({ACTIVES_OPTIONS : o})
                        console.log(o)
                        break;
                    case "ACTIVES_OTCBB":
                        console.log("OTCBB Activies")
                        console.log(m)
                        break;
                    default:
                        //console.log(`Default Message: ${msg}`);
                        //console.log(msg);
                }
            });
        }

        if (msg.response) {
            msg.response.forEach((m) => {
                switch (m.service) {
                    case "ADMIN":
                        if (m.content.code === 0) {
                            console.log(`Login Sucuess! [code: ${m.content.code} msg:${m.content.msg}`);
                            tickerSubscribe( ["QQQ","GLD","SPY","TSLA","AAPL","AMD","AMZN"]);
                            getWatchLists()
                            initStream()
                            //getInsturment("TSLA")
                        } else {
                            console.log(`LOGIN FAILED!! [code: ${m.content.code} msg:${m.content.msg}`);
                        }
                        break;
                    case "CHART_EQUITY":
                        break;
                    case "ACTIVES_NASDAQ":
                        console.log(msg)
                        break;
                    default:
                    //console.log(`Default Message ${msg}`)
                    console.log(msg)
                    break;
                }
            });
        }
    }
};

function sendMsg(c){
    console.log(`Sending: ${JSON.stringify(c)}`);
    ws.send(JSON.stringify(c));
};

function initStream(){
    sendMsg({
        "requests": [
            {
               "service": "ACTIVES_NASDAQ", 
               "requestid": "3", 
               "command": "SUBS", 
               "account": principals.accounts[0].accountId, 
               "source": principals.streamerInfo.appId, 
               "parameters": {
                  "keys": "NASDAQ-ALL", 
                  "fields": "0,1"
               }
            }, 
            {
               "service": "ACTIVES_OTCBB", 
               "requestid": "5", 
               "command": "SUBS", 
               "account": principals.accounts[0].accountId, 
               "source": principals.streamerInfo.appId, 
               "parameters": {
                  "keys": "OTCBB-ALL", 
                  "fields": "0,1"
               }
            }, 
            {
               "service": "ACTIVES_NYSE", 
               "requestid": "2", 
               "command": "SUBS", 
               "account": principals.accounts[0].accountId, 
               "source": principals.streamerInfo.appId, 
               "parameters": {
                  "keys": "NYSE-ALL", 
                  "fields": "0,1"
               }
            }, 
            {
               "service": "ACTIVES_OPTIONS", 
               "requestid": "4", 
               "command": "SUBS", 
               "account": principals.accounts[0].accountId, 
               "source": principals.streamerInfo.appId,             
               "parameters": {
                  "keys": "OPTS-DESC-ALL", 
                  "fields": "0,1"
               }
            }
        ]
    })
    sendMsg({
        "requests": [
            {
               "service": "CHART_FUTURES",
               "requestid": "2",
               "command": "SUBS",
               "account": principals.accounts[0].accountId, 
               "source": principals.streamerInfo.appId,    
               "parameters": {
                  "keys": "/ES",
                  "fields": "0,1,2,3,4,5,6,7"
               }
            }
        ]
    })
}

let watchlists = {}
function getWatchLists(){
    return new Promise((sucsess, fail) => {
        fetch("https://charleskiel.dev:8000/watchlists", {
            method: "GET",
            mode: "cors",
            headers: {"Content-Type": "application/json"},
        })
        .then((response) => response.json())
        .then((response) => {
            watchlists = response ;
        })
    })
}


function tickerSubscribe(key){
    if (!stocks[key]) stocks[key] = {key:key}
    
    //let keys = []
    
    //let keys = [...key]
    //console.log(_.keys(this.state).map(m => m.key).toString())
    sendMsg({
        requests: [
            {
                service: "QUOTE",
                requestid: requestid(),
                command: "SUBS",
                account: principals.accounts[0].accountId,
                source: principals.streamerInfo.appId,
                parameters: {
                    keys: [..._.keys(stocks).map(stock => stock.key)].toString(),
                    fields: "0,1,2,3,8,9,10,11,12,13,14,15,16,17,18,24,25,28,29,40",
                },
            },
        ],
    });
};


function equityTick(tick){
    console.log(tick)
    stocks[tick.key] = {...stocks[tick.key],...tick}
};