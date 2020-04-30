const fs = require('fs');
const request = require('request');
const moment = require('moment');


module.exports.refresh = () => {
    console.log("Validating credientials")
    validatetoken()
    validateprincipals()
}
    
function errorHandler(err, req, res, next) {
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

        console.log(req)
        let str = ""
        if (req.frequency == "") {
            str = `https://api.tdameritrade.com/v1/marketdata/${req.symbol}/pricehistory?&periodType=&period=1&frequencyType=minute&frequency=1`
        }else{
            str = `https://api.tdameritrade.com/v1/marketdata/${req.symbol}/pricehistory?&periodType=${req.periodType}&period=${req.period}&frequencyType=${req.frequencyType}&frequency=${req.frequency}`
            
        }
        console.log(str)
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
module.exports.watchlists = () => {
    return new Promise((result,error) =>{
        getdata(`https://api.tdameritrade.com/v1/accounts/${JSON.parse(fs.readFileSync('./tda/user_principals.json')).accounts[0].accountId }/watchlists`)
            .then((fetch) => {result(fetch)}).catch((fail) => {error(fail)})
    })
}





function getdata(endpoint) {
    console.log(endpoint)
    return new Promise((result, fail) => {
        const options = {
            headers: getAuthorizationHeader(),
            url: endpoint,
            method: 'GET',
        };

        request(options, function (error, response, body) {
            if (response.statusCode === 200) {
                console.log(body)
                let j = JSON.parse(body)
                console.log(j);
                result(j)
            }
            else {
                switch (response.statusCode) {
                    case 400:
                        console.log('400 Validation problem with the request.');
                        break;
                    case 401:
                        console.log('401 hint: refresh token');
                        refreshAccessToken();
                        break;
                    case 500:
                        console.log('500 There was an unexpected server error.');
                        break;
                    case 403:
                        console.log('403 Caller doesn\'t have access to the account in the request.');
                        break;
                    case 503:
                        console.log('503 Temporary problem responding.');
                        break;
                    default:
                        console.log('000 Something ain\'t right...');
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


function validatetoken() {
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


function validateprincipals() {
    console.log("Validating Pricipals")

    const access_token = JSON.parse(fs.readFileSync('./tda/access_token.json'))
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

function refreshAccessToken() {


    // 1. get refresh token and determine if expired or not.

    // read json file
    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    const access_token = JSON.parse(fs.readFileSync('./tda/access_token.json'))
    const accountInfo = JSON.parse(fs.readFileSync('./tda/account_info.json'))


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

function getAuthorizationHeader() {
    const access_token = JSON.parse(fs.readFileSync('./tda/access_token.json'))
    return {
        'Authorization': 'Bearer ' + access_token.access_token
    };
}



