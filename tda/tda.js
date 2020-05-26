const fs = require('fs');
const request = require('request');
const _ = require('lodash')
const moment = require('moment');
const WebSocket = require('websocket').w3cwebsocket;


let _requestid = 0; function requestid(){return _requestid += +1;};
let _msgcount = 0; function msgcount(){return _msgcount += +1;};
let _packetcount = 0; function packetcount(){return _packetcount += +1;};


var stocks = {}
var futures = {}
var activities = {
    ACTIVES_NASDAQ : [],
    ACTIVES_NYSE : [],
    ACTIVES_OPTIONS : [],
    ACTIVES_OTCBB : []
}


let refreshTokenInfo =  JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
let access_token =  JSON.parse(fs.readFileSync('./tda/access_token.json'))
let accountInfo =  JSON.parse(fs.readFileSync('./tda/account_info.json'))
let principals = JSON.parse(fs.readFileSync('./tda/user_principals.json'))
//function principals(){ JSON.parse(fs.readFileSync('./tda/user_principals.json'), (err) => { if (err) console.error(err); })}
var stocktestlist = ["QQQ","SPY","GLD","AMD","HD","NVDA","ACB","WMT","BJ","TGT","MSFT","NVDA","ROKU","NFLX","ADBE","SHOP","TSLA","GOOG","AMZN","JNJ","BYND","SMH","MU","LOW","DIS","FDX","CAT","MMM","UPS","YUM","DLTR","BANK","BBY"]
var futurestestlist = ["/ES","/MYM","/MNQ","/M2K","/MES","/BTC","/KC","/HG","/ZC","/HE","/GC","/M6A","/M63","/M6B","/ZT","/ZN","/ZB","/ZF","/6A","/6B","/6C","/6E","/6N","/NG","/LE","/YM","/YG","/QM","/NG","/PL","/SI","/DX","/TN"]


jsonToQueryString = (json) => {return Object.keys(json).map(function (key) {return (encodeURIComponent(key) +"=" +encodeURIComponent(json[key]));}).join("&");};
const mysql = require('mysql');
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Alabama!9044013083828789',
    database: 'marketmanager'
});


var ws = new WebSocket("wss://streamer-ws.tdameritrade.com/ws")

module.exports.load = function() { 
    module.exports.refresh()
    
    ws.onopen = function () {
        //console.log(moment(Date.now()).format() + principals.accounts);
        console.log(moment(Date.now()).format() + ": Connected to Server");
        
        //console.log(moment(Date.now()).format() + login)
        sendMsg({
            requests: [
                {
                    service: "ADMIN",
                    command: "LOGIN",
                    requestid: requestid(),
                    account: principals.accounts[0].accountId,
                    source: principals.streamerInfo.appId,
                    parameters: {
                        credential: jsonToQueryString(credentials()),
                        token: principals.streamerInfo.token,
                        version: "1.0",
                        qoslevel: 0
                    }
                }
            ]
        }
    )}
    ws.onmessage = function (event) {
        //console.log('Message from server ', event.data);
        msgRec(JSON.parse(event.data));

        //setState({ packetcount: state.packetcount += 1 })
        //console.log(msg)
    }

    ws.onerror = function(error){
        console.log(error);
    };
    
    ws.onclose = function () { console.log(moment(Date.now()).format() + ': echo-protocol Connection Closed'); process.exit();}
}

module.exports.refresh = () => {
    console.log(moment(Date.now()).format() + ": Validating credientials")
    validatetoken()
    validateprincipals()
    refreshAccessToken()
    module.exports.getWatchlists().then(data => {console.log(data);})
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
            .then((data) => {result(data)})
            .catch((fail) => {error(fail)})
    })
}


module.exports.chains = (symbol) => {
    return new Promise((result,error) =>{
        getdata(`https://api.tdameritrade.com/v1/marketdata/chains?symbol=${symbol}&includeQuotes=TRUE`)
            .then((data) => {result(data)}).catch((fail) => {error(fail)})
    })
}

module.exports.status = () => {
    return new Promise((result,error) =>{
        result({
            systemtime : Date.now(),
            msgcount : _msgcount,
            packetcount : _packetcount
        })
        error(fail)
    })
}

module.exports.state = () => {
    return new Promise((result,error) =>{
        result({
                activities : activities,
                stocks : stocks,
                futures : futures
            })
        error(fail)
    })
}


module.exports.getWatchlists = () => {
    return new Promise((result,error) =>{
        getdata(`https://api.tdameritrade.com/v1/accounts/${JSON.parse(fs.readFileSync('./tda/user_principals.json')).accounts[0].accountId }/watchlists`)
            .then((data) => {
                console.log(moment(Date.now()).format() + `: Sucuess: ${data.length}`)
                //debugger
                watchlists = data
                
                data.map(_list => {
                    _list.watchlistItems.map(_item => {
                        if (_item.instrument.symbol.includes("/")){
                            futureslist = [...futureslist,_item.instrument.symbol]
                        }else{
                            stocklist = [...stocklist,_item.instrument.symbol]
                        }
                    })
                })
                
                //stocklist = stocklist.filter((item, index) => stocklist.indexOf(item) != index)
                
                //debugger
                
                stocklist.map(_key => {
                    if (!stocks[_key]) stocks[_key] = {key:_key}
                })
                //debugger
                
                if (futureslist.length > 0) futureslist.map(_key => {
                    if (!futures[_key]) futures[_key] = {key:_key}
                })
                //debugger

                result(data)

            }).catch(
                (fail) => {error(fail)})
    })
}





function getdata(endpoint){
    console.log(moment(Date.now()).format() + endpoint)
    return new Promise((result, fail) => {
        const options = {
            headers: getAuthorizationHeader(),
            url: endpoint,
            method: 'GET',
        };

        request(options, function (error, response, body) {
            if (response.statusCode === 200) {
                if (body != "") {
                
                //console.log(moment(Date.now()).format() + body)
                let j = JSON.parse(body)
                //console.log(moment(Date.now()).format() + j);
                result(j)
                } else
                {fail(response.statusMessage)}
            }
            else {
                switch (response.statusCode) {
                    case 401:
                        console.log(moment(Date.now()).format() + ': 401 hint: refresh token');
                        //console.log(moment(Date.now()).format() + refreshAccessToken)
                        refreshAccessToken();
                        break;
                    default:
                        console.log(moment(Date.now()).format() + `: ERROR: ${response.statuscode}:::  ${response.statusMessage}`);
                        break;
                }
                fail({
                    name: response.statusCode,
                    msg: "ERROR"
                })
            } 
        })
    });
}


function validatetoken(){
    console.log(moment(Date.now()).format() + ": Validating Token")

    const access_token = JSON.parse(fs.readFileSync('./tda/access_token.json'))
    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    
    console.log(moment(Date.now()).format() + `: Access code expires ${moment(access_token.created_on + access_token.expires_in).fromNow()}`)
    console.log(moment(Date.now()).format() + ": =================================================")
    console.log(moment(Date.now()).format() + `: Refresh Token updated ${moment(refreshTokenInfo.updated_on).fromNow()}, expires ${moment(refreshTokenInfo.updated_on).add(90, 'days').fromNow()}. No update needed.`)
    
    if (Date.now() >= access_token.created_on + (access_token.expires_in *1000)) {
        console.log(moment(Date.now()).format() + ": Token appears to be expired... Refreshing");
        refreshAccessToken()
    }
    else {
        console.log(moment(Date.now()).format() + `: Access Token OK updated ${moment(access_token.created_on).fromNow()}, expires ${moment(refreshTokenInfo.expires_on).add(90, 'days').fromNow()}.`)
    }
    
}


function validateprincipals(){
    console.log(moment(Date.now()).format() + ": Validating Pricipals")

    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    const user_principals = JSON.parse(fs.readFileSync('./tda/user_principals.json'))
    
    console.log(moment(Date.now()).format() + `: Principals updated ${moment(user_principals.streamerInfo.tokenTimestamp).fromNow()}, expires ${moment(user_principals.tokenExpirationTime).fromNow()}`)
    console.log(moment(Date.now()).format() + moment(user_principals.streamerInfo.tokenTimestamp).format())
    console.log(moment(Date.now()).format() + moment(Date.now()).format())
    console.log(moment(Date.now()).format() + moment(Date.now()).diff(user_principals.streamerInfo.tokenTimestamp, "seconds"))


    if (moment(user_principals.streamerInfo.tokenTimestamp).diff(Date.now()) <= 0) {
        console.log(moment(Date.now()).format() + ": =================================================")
        console.log(moment(Date.now()).format() + ": Principals appears to be expired... Refreshing");
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
                    console.log("writing Principals File")
                    fs.writeFileSync("./tda/user_principals.json", JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
                    console.log(moment(Date.now()).format() + `: principals updated. Expires ${moment(user_principals.tokenExpirationTime).fromNow()} `);
                }
                //debugger
            })
            .catch((fail) => { console.log(moment(Date.now()).format() + fail) })
        
        
        

    }
    else {
        console.log(moment(Date.now()).format() + `: Principals OK updated ${moment(user_principals.streamerInfo.tokenTimestamp).fromNow()}, expires ${moment(refreshTokenInfo.expires_on).add(90, 'days').fromNow()}.`)
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

    console.log(moment(Date.now()).format() + options.form)
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
            
            console.log(moment(Date.now()).format() + ": Access Token updated. Expires in " + data.expires_in + " seconds");
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

function credentials () {
    
//console.log(moment(Date.now()).format() +  JSON.parse(fs.readFileSync('./tda/user_principals.json','utf8'), (err) => { if (err) console.error(err); }))
//console.log(moment(Date.now()).format() + principals)
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
    //sendToClients(msg)
    packetcount()
    if (msg.notify) {
        console.log(moment(Date.now()).format() + `: heartbeat: ${moment.unix(msg.notify[0].heartbeat).format()}`)
        //console.log(moment(Date.now()).format() + msg)
    } else {
        if (msg.data) {
            msg.data.forEach((m) => {
                msgcount()
                //console.log(moment(Date.now()).format() + m)
                dbWrite(m)
                switch (m.service) {
                    case "QUOTE":
                        m.content.forEach(eq => equityTick(eq));
                        break;
                    case "CHART_FUTURES":
                        m.content.forEach(eq => equityTick(eq));
                        break;
                    case "ACTIVES_NASDAQ":
                        var split = m.content[0]["1"].split(";")
                        console.log(split)
                        if (split.length > 1){
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
                            }
                            activities.ACTIVES_NASDAQ = [o]
                        }
                    case "ACTIVES_NYSE":
                        var split = m.content[0]["1"].split(";")
                        if (split.length > 1){
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
                            }
                            activities.ACTIVES_NYSE = [o]
                            
                            break;
                        }
                    case "ACTIVES_OPTIONS":
                        // //console.log(moment(Date.now()).format() + ": OPTIONS Activies")
                        // //console.log(moment(Date.now()).format() + m)
                        // var split = m.content[0]["1"].split(";")
                        // var o = {
                        // "timestamp" : m.timestamp,
                        // "ID:" : split[0],
                        // "sampleDuration" : split[1],
                        // "Start Time" : split[2],
                        // "Display Time" : split[3],
                        // "GroupNumber" : split[4],
                        // "groups" : []}

                        // split = (split[6].split(":"))
                        // o.totalVolume = (split[3])
                        // o.groupcount = split[1]

                        // for (let i = 3; i < split.length; i += 4) {
                        //     //if (!this.state[split[i]]) this.stockTickerSubscribe([split[i]])
                        //     o.groups.push({symbol: split[i], name: split[i+1], volume: split[i+2], percentChange: split[i+3]}) 
                        // }
                        
                        console.log(moment(Date.now()).format() + `: Default Message: ` + m.service, m);
                        //console.log(moment(Date.now()).format() + msg);
                }
            });
        }

        if (msg.response) {
            msg.response.forEach((m) => {
                switch (m.service) {
                    case "ADMIN":
                        if (m.content.code === 0) {
                            console.log(moment(Date.now()).format() + `: Login Sucuess! [code: ${m.content.code} msg:${m.content.msg}`);
                            initStream()
                            module.exports.getWatchlists()
                            .then(data => {
                                console.log(data)
                                subscribe()
                            })
                        } else {
                            console.log(moment(Date.now()).format() + `: LOGIN FAILED!! [code: ${m.content.code} msg:${m.content.msg}`);
                        }
                        break;
                    case "CHART_EQUITY":
                        console.log(moment(Date.now()).format() + m)
                        break;
                    case "ACTIVES_NASDAQ":
                        break;
                    case "ACTIVES_NASDAQ":
                        break;
                    default:
                    //console.log(moment(Date.now()).format() + `: Default Message ${msg}`)
                    console.log(m)
                    break;
                }
            });
        }
    }
};

function sendMsg(c){
    console.log(moment(Date.now()).format() + `: Sending: ${JSON.stringify(c)}`);
    ws.send(JSON.stringify(c));
};

function initStream(){
    sendMsg({
        "requests": [
            {
               "service": "ACTIVES_NASDAQ", 
               "requestid": requestid(), 
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
               "requestid": requestid(), 
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
               "requestid": requestid(), 
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
               "requestid": requestid(), 
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
    
}

var watchlists = {}

var futureslist = []
var stocklist = []
function subscribe(){
        console.log(moment(Date.now()).format() + `: Subscribing to ${stocklist.length} stocks `)
        
        sendMsg({
            requests: [{
                service: "QUOTE",
                requestid: requestid(),
                command: "SUBS",
                account: principals.accounts[0].accountId,
                source: principals.streamerInfo.appId,
                parameters: {
                    //keys: [..._.keys(stocks).map(stock => stock.key), ...keys].toString(),
                    keys: stocklist.toString(),
                    fields: "0,1,2,3,8,9,10,11,12,13,14,15,16,17,18,24,25,28,29,30,31,40,49",
                }
            }]
        })
                        
        sendMsg({
            requests: [{
                service: "CHART_EQUITY",
                requestid: requestid(),
                command: "SUBS",
                account: principals.accounts[0].accountId,
                source: principals.streamerInfo.appId,
                parameters: {
                    keys: stocklist.toString(),
                    fields: "0,1,2,3,4,5,6,7,8"
                }
            }]
        })

        sendMsg({
            requests: [{
                service : "NEWS_HEADLINE",
                requestid: requestid(),
                command : "SUBS",
                account : principals.accounts[0].accountId, 
                source : principals.streamerInfo.appId,    
                parameters : {
                    keys: stocklist.toString(),
                    fields : "0,1,2,3,4,5,6,7,8,9,10"
                }
            }]
        })
                
        // sendMsg({
        //     requests: [{
        //         //     service : "TIMESALE_EQUITY",
        //         //     requestid : "2",
        //         //     command : "SUBS",
        //         //     account : "your_account0",
        //         //     source : "your_source_id",
        //         //     parameters : {
        //         //         keys : [..._.keys(stocks).map(stock => stock.key), ...key].toString(),
        //         //         fields : "0,1,2,3,4"
        //         //         }
        //         // }
        //     }]
        // });
    
        if (futureslist.length > 0){

            
            if (!futures[key]) futures[key] = {key:key}
            console.log(moment(Date.now()).format() + `: Subscribing to ${futureslist.length} futures `)
            
            sendMsg({
                requests: [{
                    service : "CHART_FUTURES",
                    requestid: requestid(),
                    command : "SUBS",
                    account : principals.accounts[0].accountId, 
                    source : principals.streamerInfo.appId,    
                    parameters : {
                        keys: futureslist.toString(),
                        fields : "0,1,2,3,4,5,6,7"
                    }
                }]
            })
                    
            sendMsg({
                requests: [{
                        service : "LEVELONE_FUTURES",
                        requestid : requestid(),
                        command : "SUBS",
                        account : principals.accounts[0].accountId, 
                        source : principals.streamerInfo.appId,    
                        parameters : {
                            keys: futureslist.toString(),
                            fields : "0,1,2,3,4"
                        }
                    
                }]
            })
            
            sendMsg({
                requests: [{
                        service : "TIMESALE_FUTURES",
                        requestid: requestid(),
                        command : "SUBS",
                        account : principals.accounts[0].accountId, 
                        source : principals.streamerInfo.appId,    
                        parameters : {
                            keys: futureslist.toString(),
                            fields : "0,1,2,3,4"
                        }
                    }
                ]
            })
        
            // sendMsg({
            //     requests: [
            //         {
            //             service: "ADMIN",
            //             requestid: requestid(),
            //             command: "SUBS",
            //             account: principals.accounts[0].accountId,
            //             source: principals.streamerInfo.appId,
            //             parameters: {"qoslevel": "5"},
            //         },
            //     ],
            // });
        }
    
    

}


function equityTick(tick){
    //console.log(moment(Date.now()).format() + tick)
    stocks[tick.key] = {...stocks[tick.key],...tick}
};



function dbWrite(data){
    console.log(moment(Date.now()).format() + `: INSERT INTO data (service,timestamp,content) VALUES ( '${data.service}', ${data.timestamp}, '${JSON.stringify(data.content)}');`)

    data.content.map(_content =>{

        let str = `INSERT INTO data (service,timestamp,content) VALUES ( '${data.service}', ${data.timestamp}, '${mysql_real_escape_string(JSON.stringify(_content))}');`
        //console.log(str)
        con.query(str, function (error, results, fields) {
            if (error) { 
                console.log(moment(Date.now()).format() + error);
                console.log(error.sql) 
            }
        })
    })
}

function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
}

setTimeout(module.exports.refresh,(30* (60*60*1000)))
//setTimeout(module.exports.refresh,(30* (60*60*1000)))













const https = require('https');
var httpsServer = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/charleskiel.dev/cert.pem', 'utf8')
}).listen(7999);


var WebSocketServer = require('ws').Server;
var clientSocket = new WebSocketServer({server: httpsServer});

var clientSockets = Object.create(null);

clientSocket.on('connection', function connection(socket) {

console.log(socket)
	socket.on('message', msg => {
		console.log(msg);

        msg = JSON.parse(msg)
        msg.requests.forEach((m) => {
            console.log(`Received msg from ${socket._socket.remoteAddress} => ${msg}`)
            switch (m.service) {
                case "ADMIN":
                    if (m.command === "LOGIN" && m.username === "demo" && m.password === "password")
                        {
                            clientSockets[m.username] = socket
                            sendToClient(socket,{hello: "Hello!"})
                            //socket.send(JSON.stringify(clientSockets[socket]))
                            //console.log(`Logged in: ${results[0].regtoken}] ${results[0].FirstName} ${results[0].LastName}`)
                        }
                }
            }
        )
        
		if (msg.messageType == "login") {
			//clientSockets[socket] = new user(msg.data, socket, loggedin)
			console.log(`Logged in: ${JSON.stringify(clientSockets[socket])}`)
			//clientSockets[socket].socket.send(JSON.stringify(clientSockets[socket]))

        }
    
  
        
    })
        
	

	socket.on('open', msg => {
        console.log("Connected to Server ", event);

        let login = JSON.stringify({
            response: [
                {
                    service : "ADMIN", 
                    requestid : "1", 
                    command : "LOGIN", 
                    timestamp : 1400593928788, 
                    content : {
                        code: 0, 
                        msg: "29-3"
                    }
                }
            ]
        });
        
        console.log(login)
        this.socket.send(login);
	})


})


function sendToClient(socket,message) {
    console.log(clientSockets["demo"])
    console.log(`message=> ${JSON.stringify(message)}`)
    
	
		if (clientSockets["demo"].readyState === 1 ){
			//console.log(`message=====> ${JSON.stringify(message)}`)
            clientSockets["demo"].send(JSON.stringify(message))
        }
    	
}



function sendToClients(message) {
	//console.log(`message=> ${JSON.stringify(message)}`)
	clientSocket.clients.forEach( client => {
		if (client !== clientSocket && client.readyState === 1 ){
			//console.log(`message=====> ${JSON.stringify(message)}`)
          	client.send(JSON.stringify(message))
        	}
    	});
}

