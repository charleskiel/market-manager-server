const fs = require('fs');
const request = require('request');
const _ = require('lodash')
const moment = require('moment');
const WebSocket = require('websocket').w3cwebsocket;
const os = require('os')
const mysql = require('../mysql.js');
const tdaSocket = require('./tdaSocket');
const monitor = require('./monitor')
const account = require('./account')
const auth = require('./auth')
const watchlists = require('./watchlists')


const getdata = require("./getdata").getData



function getPriority(pid) { return os.getPriority(pid) }
function setPriority(id, priority) { return os.setPriority(id, priority) }


//var account = {}
var stocks = {}

let connected = false
//let principals = JSON.parse(fs.readFileSync('./auth/user_principals.json'))

let refreshTokenInfo =  JSON.parse(fs.readFileSync('./auth/refresh_token.json'))
let access_token =  JSON.parse(fs.readFileSync('./auth/access_token.json'))
let accountInfo =  JSON.parse(fs.readFileSync('./auth/account_info.json'))
let principals = JSON.parse(fs.readFileSync('./auth/user_principals.json'))
//function principals(){ JSON.parse(fs.readFileSync('./auth/user_principals.json'), (err) => { if (err) console.error(err); })}

var monitor = {
    add : (items) =>{
        let equitiesChange = false
        let indexesChange = false
        let futuresChange = false
        let optionsChange = false
        items.map(key => {
            if (!monitor.list[key])
            monitor.list[key] = {key: key}
            let type = isType(key)
            if (type == "equities" || type == "indexes" ) {indexesChange = true}
            if (type == "futures" ) {futuresChange = true}
            if (type == "options" ) {optionsChange = true}
        })
        if (equitiesChange) sendServiceMsg("equities",[...monitor.equities(),...monitor.indexes()])
        if (futuresChange) sendServiceMsg("futures",monitor.futures())
        if (optionsChange) sendServiceMsg("options",monitor.options())
    },
    remove : (items) =>{
        let change = false
        items.map(key => {
            if (monitor.list[key]) 
            delete monitor.list[key]
            change = true
        }
    )},
    list : ["/ES","/NQ","/MYM","/GC","/SI","/PL","HG","/BTC","/DX"],
    equities: () => { return _.keys(monitor.list).filter(key => (!key.includes("$") && !key.includes("/")  && key.length < 6 ) )},
    indexes : () => { return _.keys(monitor.list).filter(key => (key.includes("$") && !key.includes("/") ) )},
    futures : () => { return _.keys(monitor.list).filter(key => (!key.includes("$") && key.includes("/") ) )},
    options : () => { return _.keys(monitor.list).filter(key => (!key.includes("$") && !key.includes("/") && key.length > 5 ) )}
}

function isType(key){
    //console.log(key)
    try {
        if (!key.includes("$") && !key.includes("/")  && key.length < 6 ) return "equities"
        if (key.includes("$") && !key.includes("/") ) return "indexes"
        if (!key.includes("$") && key.includes("/") ) return "futures"
        if (!key.includes("$") && !key.includes("/") && key.length > 5 ) return "options"
    }
    catch{
        debugger
    }
}

let refreshTokenInfo =  JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/refresh_token.json'))
let access_token =  JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/access_token.json'))
let accountInfo =  JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/account_info.json'))
let principals = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/user_principals.json'))
//function principals(){ JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/user_principals.json'), (err) => { if (err) console.error(err); })}
var stocktestlist = []
var futurestestlist = ["/ES","/MYM","/MNQ","/M2K","/MES","/BTC"]




module.exports.getWatchlists = watchlists.getWatchlists
var partmsg = ""
module.exports.load = function() { 
    auth.refresh().then(() => {

        watchlists.getWatchlists().then( (lists) => {
            console.log(lists)
            //debugger
            tdaSocket.load()
            })
        }
    )

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
    return {
        service: "status",
        timestamp: Date.now(),
        os: {
            type : os.type  ,
            endiannes : os.endianness,
            hostname : os.hostname(),
            networkInterfaces : os.networkInterfaces(),
            platform : os.platform(),
            release : os.release(),
            totalmem : os.totalmem(),
        },
        system: {
            fremem  : os.freemem(),
            uptime  : os.uptime(),
            loadavg :  os.loadavg(),
            uptime  : os.uptime()
        
        },
        app: {

            systemtime: Date.now(),
            tdaSocket: tdaSocket.status,
            account: account.status(),
            uptime: process.uptime()
        },
        actives : monitor.actives
    }
    
}

function status(){
    getdata(`https://api.tdameritrade.com/v1/accounts?fields=positions,orders`)
        .then((data) => {
            account.tick(data)
            
            results = {
                service: "status",
                timestamp: Date.now(),
                content: [{
                    systemtime: Date.now(),
                    databaseWriteCount: mysql.writecount,
                    account: data,
                }],
                actives : monitor.actives
            }
            dbWrite(results)
            watchPositions()
        }
    )
}


function watchPositions(){
    //console.log(account.status())
    if (tdaSocket.status = "connected") monitor.add(account.positions().map(p => p.instrument.symbol))
}
module.exports.state = () => {

    console.log({...monitor.list()})
    // console.log(test)
    return new Promise((result,error) =>{
        result({
                actives : monitor.actives,
                stocks : {...monitor.list()},
                account: account.status(),
                
                
            })
        error(fail)
    })
}

module.exports.getWatchlists = () => {
    return new Promise((result,error) =>{
        getdata(`https://api.tdameritrade.com/v1/accounts/${JSON.parse(fs.readFileSync('./auth/user_principals.json')).accounts[0].accountId }/watchlists`)

            .then((data) => {
                console.log(moment(Date.now()).format(), `: Got ${data.length} watchlists`)
                //debugger
                watchlists = data
                //console.log(watchlists)
                let list = []
                data.map(_list => {
                    _list.watchlistItems.map(_item => {
                        list.push(_item.instrument.symbol)
                    })
                })
                monitor.add(list)
                console.log(`${_.keys(monitor.equities()).length} equities in Watchlists`)
                console.log(`${_.keys(monitor.futures()).length} futures in Watchlists`)
                console.log(`${_.keys(monitor.indexes()).length} indexes in Watchlists`)
                result(data)
            })
    })
}





function getdata(endpoint){
    //console.log(moment(Date.now()).format() + endpoint)
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
                        console.log(moment(Date.now()).format(), refreshAccessToken)
                        module.exports.refresh();
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

    const access_token = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/access_token.json'))
    const refreshTokenInfo = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/refresh_token.json'))
    
    console.log(moment(Date.now()).format() + ": =================================================")
    console.log(moment(Date.now()).format() + `: Access code expires ${moment(access_token.created_on + access_token.expires_in).fromNow()}`)
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

    const refreshTokenInfo = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/refresh_token.json'))
    const user_principals = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/user_principals.json'))
    
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
                    fs.writeFileSync("./auth/user_principals.json", JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
                    fs.writeFileSync("/var/www/charleskiel.dev/mm/auth/user_principals.json", JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
                    console.log(moment(Date.now()).format() + `: principals updated. Expires ${moment(user_principals.tokenExpirationTime).fromNow()} `);
                }
                //debugger
            }
        ).catch((fail) => { console.log(moment(Date.now()).format() + fail) })
    }
    else {
        console.log(moment(Date.now()).format() + `: Principals OK updated ${moment(user_principals.streamerInfo.tokenTimestamp).fromNow()}, expires ${moment(refreshTokenInfo.expires_on).add(90, 'days').fromNow()}.`)
    }
    
}

function refreshAccessToken(){

    const refreshTokenInfo = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/refresh_token.json'))
    const accountInfo = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/account_info.json'))
    
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
            
            fs.writeFileSync("/var/www/charleskiel.dev/mm/auth/access_token.json", JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
            
            console.log(moment(Date.now()).format() + ": Access Token updated. Expires in " + data.expires_in + " seconds");
            //debugger
        }
    });

}

function getAuthorizationHeader(){
    const access_token = JSON.parse(fs.readFileSync('/var/www/charleskiel.dev/mm/auth/access_token.json'))
    return {
        'Authorization': 'Bearer ' + access_token.access_token  
    };
}










///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////        Socket Connection        ///////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////


tdaSocket.event.on("*", function (msg) {
    //console.log(msg)
    relayToClients(msg)
    
    if (msg.content) {
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
                        
                    case "CHART_EQUITY":
                        //console.log(moment(Date.now()).format() + m)
                        
                    case "ACTIVES_NASDAQ":
                        
                    case "ACTIVES_NASDAQ":
                        
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
    ws.send(JSON.stringify(c));
};
function sendServiceMsg(_type,_keys,){
    switch (_type){
        
        case "equities":
        case "indexes" :
            console.log(moment(Date.now()).format() + `: Subscribing to ${monitor.equities().length} stocks `)
            sendMsg({
                requests: [{
                    service : "QUOTE", requestid: requestid(), command : "SUBS", account : principals.accounts[0].accountId, source : principals.streamerInfo.appId,
                    parameters : {
                        keys: _keys.toString(),
                        fields : "0,1,2,3,8,9,10,11,12,13,14,15,16,17,18,24,25,28,29,30,31,40,49"
                    }
                }]
            })
            sendMsg({
                requests: [{
                    service : "CHART_EQUITY", requestid: requestid(), command : "SUBS", account : principals.accounts[0].accountId, source : principals.streamerInfo.appId,
                    parameters : {
                        keys: _keys.toString(),
                        fields : "0,1,2,3,4,5,6,7,8"
                    }
                }]
            })
            
                
            sendMsg({
                requests: [{
                    service : "TIMESALE_EQUITY", requestid : "2", command : "SUBS", account : "your_account0", source : "your_source_id",
                    parameters : {
                        keys: _keys.toString(),
                        fields : "0,1,2,3,4"
                        }
                }]
            });
        
        switch (msg.service) {
            case "QUOTE": case "LEVELONE_FUTURES": case "TIMESALE_FUTURES": case "TIMESALE_EQUITY":
                msg.content.forEach(eq => {
                    //if (!monitor.exists(eq.key)) { monitor.add([eq.key]) }
                    monitor.tick(eq)
                });
                break;
            case "CHART_FUTURES": case "CHART_EQUITY":
                msg.content.forEach(eq => {
                    //if (!monitor.exists(eq.key)) { monitor.add([eq.key]) }
                    monitor.addChartData(eq)
                });
                break;
            case "ACTIVES_NASDAQ": case "ACTIVES_NYSE": case "ACTIVES_OTCBB":
                var split = msg.content[0]["1"].split(";")
                if (split.length > 1) {
                    var o = {
                        "timestamp": msg.timestamp,
                        "ID:": split[0],
                        "sampleDuration": split[1],
                        "Start Time": split[2],
                        "Display Time": split[3],
                        "GroupNumber": split[4],
                        "groups": []
                    }
                    split = (split[6].split(":"))
                    o.totalVolume = (split[0])
                    o.groupcount = split[1]
                    for (let i = 3; i < split.length; i += 3) {
                        if (!stocks[split[i]]) stocks[split[i]] = { key: split[i] }
                        o.groups.push({ symbol: split[i], volume: split[i + 1], priceChange: split[i + 2] })
                    }
                    monitor.actives[msg.service][o.sampleDuration] = o
                    
                }
                break;
            case "ACTIVES_OPTIONS":
                //console.log(moment(Date.now()).format() + ": OPTIONS Activies")
                //console.log(m)
                //debugger
                msg.content.map(act => {
                    
                    var split = act["1"].split(";")
                    if (split[1]) {
                        var o = {
                            "timestamp": msg.timestamp,
                            "ID:": split[0],
                            "sampleDuration": split[1],
                            "Start Time": split[2],
                            "Display Time": split[3],
                            "GroupNumber": split[4],
                            "groups": []
                        }

                        split = (split[6].split(":"))
                        o.totalVolume = (split[3])
                        o.groupcount = split[1]
                        //o.sampleDuration
                        for (let i = 3; i < split.length; i += 4) {
                            //if (!this.state[split[i]]) this.stockTickerSubscribe([split[i]])
                            o.groups.push({ symbol: split[i], name: split[i + 1], volume: split[i + 2], percentChange: split[i + 3] })
                        }
                        
                        //console.log(moment(Date.now()).format() + `: Default Message: ` + msg.service, m);
                        //console.log(moment(Date.now()).format() + m);
                        monitor.actives.ACTIVES_OPTIONS[o.sampleDuration] = o
                    }
                })
                break;
            default:
                console.log(msg)
                console.log(msg.service + " not handled")
				console.log(`\x1b[44m [${moment(Date.now()).format()}] \x1b[0m  ${msg.service}  \x1b[41m ${msg.content.code}  \x1b[0m ${msg.content.msg}`, msg);
                
                //debugger
        }
    }
})


function equityTick(tick){
    if (tick.key === "TWTR") console.log(`${moment(Date.now()).format()}`,tick)
    stocks[tick.key] = {...stocks[tick.key],...tick}
};



function dbWrite(data){
    let color = ""
    data.content.map(_content =>{
        let str = ""
        //console.log(moment(data.timestamp).format("h:mm:ss a") + `: INSERT INTO data (service,timestamp,content) VALUES ( '${data.service}', ${data.timestamp}, '${JSON.stringify(data.content)}');`);
        if (data.service === "ACTIVES_NYSE") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[33m"
        } //Yellow
        else if (data.service === "ACTIVES_NASDAQ") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[34m"
        } //Blue
        else if (data.service === "ACTIVES_OPTIONS") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[34m"
        } //Blue
        else if (data.service === "ACTIVES_OTCBB") {
            str = "INSERT INTO `" + data.service + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[36m"
        } //Teal
        else if (data.service === "QUOTE") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[35m"
        } //Magenta
        else if (data.service === "CHART_EQUITY") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[31m"
        } //Magenta
        else if (data.service === "CHART_FUTURES") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[35m"
        } //Magenta
        else if (data.service === "LEVELONE_FUTURES") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[32m"
        } //Green
        else if (data.service === "TIMESALE_FUTURES") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[92m"
        } //Bright Green
        else if (data.service === "NEWS_HEADLINE") {
            str = "INSERT INTO `" + data.service + "` (`key`,timestamp,content) VALUES ('" + _content.key + "'," + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"

            } //Bright Green
        else if (data.service === "status")
        {
            color = "\x1b[93m";
        } //Blue
        else
        {
            //console.log(moment(data.timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] :: ${JSON.stringify(data.content)}\x1b[37m \x1b[40m`);
            str = "INSERT INTO `" + data.service.toUpperCase() + "` (timestamp,content) VALUES (" + data.timestamp + ",'"+ mysql_real_escape_string(JSON.stringify(_content)) + "');"
            color = "\x1b[5m"
        }


        //console.log("\x1b[40m")
        //console.log("\x1b[37m")

        //let str = `INSERT INTO data (service,timestamp,content) VALUES ( '${data.service}', ${data.timestamp}, '${mysql_real_escape_string(JSON.stringify(_content))}');`
        //console.log(str)
        if (str) mysql.query(str)
    })
    //console.log(moment(data.timestamp).format("LTS") + color + ` [${data.service.padEnd(16, " ")}] :: ${JSON.stringify(data.content)}\x1b[37m \x1b[40m`);

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

setInterval(status,1000)













const https = require('https');
const { send } = require('process');
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
        console.log(`Received messages from ${socket._socket.remoteAddress}`, msg)

        msg = JSON.parse(msg)
        msg.requests.forEach((m) => { 
            console.log(`Received msg from ${socket._socket.remoteAddress}`,msg)
            switch (m.service) {
                case "ADMIN":
                    switch (m.command){
                        case "LOGIN":
                            if( m.username === "demo" && m.password === "password"){
                                clientSockets[socket] = {username : m.username, socket : socket, monitor: []}
                                sendToClient(socket,{hello: "Hello!"})
                            }
                            break;
                        case "SETCOMMANDKEY":
                            if(auth.checkCommandKey(m.commandKey)){
                                clientSockets[socket] = m.username
                                sendToClient(socket,{
                                    response: [
                                        {
                                            service: "ADMIN",
                                            command: "SETTING",
                                            setting: {commandKeyStatus: "granted"},
                                            requestId: m.requestId,
                                        },
                                    ]
                            })

                            break;}
                    }
            }
        
		if (msg.me == "login") {
			//clientSockets[socket] = new user(msg.data, socket, loggedin)
			console.log(`Logged in: ${JSON.stringify(clientSockets[socket])}`)
			//clientSockets[socket].socket.send(JSON.stringify(clientSockets[socket]))

        }
    
  
        
    })
        
    })

	socket.on('open', msg => {
        console.log("Connected to Server ", msg);

        let login = JSON.stringify({
            response: [
                {
                    service : "ADMIN", 
                    requestId : "1", 
                    command : "LOGIN", 
                    timestamp : 1400593928788, 
                    content : {
                        code: 0, 
                        msg: "29-3"
                    }
                }
            ]
        });
        
        console.log(moment(Date.now()).format(), login)
        this.socket.send(login);
	})


})


function sendToClient(socket,message) {
    console.log(clientSockets[socket])
    console.log(`tosendmessage`, JSON.stringify(message))
    
	
    if (socket.readyState === 1 ){
        console.log(`Sending message`, JSON.stringify(message))
        socket.send(JSON.stringify(message))
    }
    	
}



function relayToClients(message) {
	clientSocket.clients.forEach( client => {
		if ( client.readyState === 1 ){
			//console.log("Sending" , JSON.stringify(message))
          	client.send(JSON.stringify(message))
        	}
    	});
}
