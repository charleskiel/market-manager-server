const fs = require('fs');
const request = require('request');
const moment = require('moment');


module.exports.refresh = () => {
    console.log("Test")
    validatetoken()
}
    
function errorHandler(err, req, res, next) {
    res.status(500)
    res.render('error', { error: err })
}



module.exports.priceHistory = (symbol) => {
    const headers = getAuthorizationHeader();
    const options = {
        headers: headers,
        url: `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?&periodType=day&period=1&frequencyType=minute&frequency=1`,
        method: 'GET',
    };
    return new Promise((resolve, reject) => {

        request(options, function (error, response, body) {
            if (response.statusCode === 200) {
                console.log(body);
                let j = JSON.parse(body)
                console.log(`Got price history for ${symbol}::: Start: ${moment(j.candles[0].datetime).utcOffset("+05:00").format('MMMM Do YYYY, h:mm:ss a')}  End: ${moment(j.candles[j.candles.length - 1].datetime).utcOffset("+05:00").format('MMMM Do YYYY, h:mm:ss a')} Candles: ${j.candles.length} `)
                fs.writeFile(`./data/${symbol}.json`, JSON.stringify(j, undefined, 4), (err) => { if (err) throw err; })
                resolve(j)
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
                reject({
                    name: response.statusCode,
                    message: "ERROR"
                })

            }
        })

    });
};

function validatetoken() {
    console.log("Validating Token")

    const accessTokenInfo = JSON.parse(fs.readFileSync('./tda/access_token.json'))
    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    
    console.log(`Access code expires ${moment(accessTokenInfo.created_on + accessTokenInfo.expires_in).fromNow()}`)

    console.log("=================================================")

    console.log(`Refresh Token updated ${moment(refreshTokenInfo.updated_on).fromNow()}, expires ${moment(refreshTokenInfo.updated_on).add(90, 'days').fromNow()}. No update needed.`)
    
    
    
    if (Date.now() >= accessTokenInfo.created_on + (accessTokenInfo.expires_in *1000)) {
        console.log("Token appears to be expired... Refreshing");
        
        //debugger
        refreshAccessToken()
    }
    else {
        //debugger
        console.log(`Access Token OK updated ${moment(accessTokenInfo.created_on).fromNow()}, expires ${moment(refreshTokenInfo.expires_on).add(90, 'days').fromNow()}.`)
        //console.log(`${Date.now()} > ${accessTokenInfo.expires_on} = true`)
    }

    
}

function refreshAccessToken() {


    // 1. get refresh token and determine if expired or not.

    // read json file
    const refreshTokenInfo = JSON.parse(fs.readFileSync('./tda/refresh_token.json'))
    const accessTokenInfo = JSON.parse(fs.readFileSync('./tda/access_token.json'))
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
            
            fs.writeFile("./tda/access_token.json", JSON.stringify(data, undefined, 4), (err) => { if (err) throw err; })
            
            console.log("Access Token updated. Expires in " + data.expires_in + " seconds");
            //debugger
        }
        //debugger
    });

}

function getAuthorizationHeader() {
    const accessTokenInfo = JSON.parse(fs.readFileSync('./tda/access_token.json'))
    return {
        'Authorization': 'Bearer ' + accessTokenInfo.access_token
    };
}



