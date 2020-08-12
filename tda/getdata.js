const auth = require('./auth')
const request = require("request");
const moment = require("moment");




exports.getData = (endpoint) => {
    //console.log(moment(Date.now()).format(), endpoint)
    return new Promise((result, fail) => {
        const options = {
            headers: auth.getAuthorizationHeader(),
            url: endpoint,
            method: 'GET',
        };

        request(options, function (error, response, body) {
            //console.log(response)
            if (response && response.statusCode === 200) {
                if (body != "") {
                
                //console.log(moment(Date.now()).format() + body)
                let j = JSON.parse(body)
                //console.log(moment(Date.now()).format() + j);
                result(j)
                } else
                {fail(response.statusMessage)}
            }
            else if (response){
                switch (response.statusCode) {
                    case 401:
                        console.log(moment(Date.now()).format() + ': 401 hint: refresh token');
                        //console.log(moment(Date.now()).format(), refreshAccessToken)
                        auth.refresh();
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
            else {
                fail(error)
            }
        })
    });
}





