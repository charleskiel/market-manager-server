const fs = require('fs');
const moment = require("moment");
const request = require("request");

const getdata = require ('./getdata').getData


let principals = JSON.parse(fs.readFileSync("./auth/user_principals.json"));


module.exports.accountId = () => {
	return principals.accounts[0].accountId
}

module.exports.appId = () => {
	return principals.streamerInfo.appId;
}

module.exports.checkCommandKey = (key) => {if (key === "Denver"){return true} else {return false}}

module.exports.refresh = () => {
	return new Promise((ok, fail) => {
		console.log(moment(Date.now()).format() + ": Validating credientials");
		validateAccessToken().then((result) => {
			console.log(result); // print validateAAccessToken response
			validateprincipals()
				.then((result) => ok(result))
				.catch((result) => fail(result));
		});
		//refreshAccessToken()
		//console.log(data);
	});
};


function validateAccessToken() {
	try {
		return new Promise((ok, fail) => {
			console.log(moment(Date.now()).format() + ": Validating Token");

			const access_token = JSON.parse(fs.readFileSync("./auth/access_token.json"));
			const refreshTokenInfo = JSON.parse(fs.readFileSync("./auth/refresh_token.json"));

			console.log(
				moment(Date.now()).format() +
					`: Refresh Token last updated ${moment(refreshTokenInfo.updated_on).fromNow()}, expires ${moment(refreshTokenInfo.updated_on).add(90, "days").fromNow()}. No update needed.`
			);

			if (Date.now() >= access_token.created_on + access_token.expires_in * 1000) {
				console.log(moment(Date.now()).format() + ": Token appears to be expired... Refreshing");
				refreshAccessToken()
					.then(response => ok(response ))
					.catch((error) => {
						console.log(error);
						//debugger;
						fail("Something went wrong");
					});
			} else {
				ok(moment(Date.now()).format() + `: Access Token OK! Updated ${moment(access_token.created_on).fromNow()}, expires ${moment(refreshTokenInfo.created_on).add(90, "days").fromNow()}.`);
			}
		});
		
	} catch (error) {
		
	}
}

function validateprincipals() {
	try {
		
		return new Promise((ok, fail) => {
			console.log(moment(Date.now()).format() + ": Validating Pricipals");

			const refreshTokenInfo = JSON.parse(fs.readFileSync("./auth/refresh_token.json"));
			const user_principals = JSON.parse(fs.readFileSync("./auth/user_principals.json"));

			//console.log(moment(Date.now()).format() + moment(user_principals.streamerInfo.tokenTimestamp).format());
			//console.log(moment(Date.now()).format() + moment(Date.now()).diff(user_principals.streamerInfo.tokenTimestamp, "seconds"));

			if (Date.now() >= moment(user_principals.tokenExpirationTime).unix() * 1000) {
				// console.log(user_principals.streamerInfo.tokenTimestamp);
				// console.log(moment(user_principals.streamerInfo.tokenTimestamp).unix() * 1000);
				// console.log(moment(user_principals.tokenExpirationTime).unix() * 1000);
				// console.log(Date.now() > moment(user_principals.streamerInfo.tokenTimestamp).unix() * 1000);
				// console.log(moment(Date.now()).format() + ": =================================================");
				// console.log(moment(Date.now()).format() + ": Principals appears to be expired... Refreshing");
				getdata("https://api.tdameritrade.com/v1/userprincipals?fields=streamerSubscriptionKeys%2CstreamerConnectionInfo%2Cpreferences%2CsurrogateIds")
					.then((data) => {
						// 3. now that you have the access token, store it so it persists over multiple instances of the script.
						console.log(data);
						if (data.error == "Invalid ApiKey") {
							debugger;
							fail("Invalid ApiKey");
						} else if (data.error == "Invalid ApiKey") {
							debugger;
							fail("Invalid ApiKey");
						} else if (data.error == "invalid_grant") {
							debugger;
							fail("invalid_grant");
						} else {
							//debugger;
							console.log("writing Principals File");
							fs.writeFileSync("./auth/user_principals.json", JSON.stringify(data, undefined, 4), (err) => {
								if (err) throw err;
							});
							principals = data;
							ok(`principals updated. Expires ${moment(data.tokenExpirationTime).fromNow()} `);
						}
						//debugger
					})
					.catch((fail) => {
						console.log(moment(Date.now()).format(), fail);
					});
			} else {
				ok(moment(Date.now()).format() + `: Principals updated ${moment(user_principals.streamerInfo.tokenTimestamp).fromNow()}, expires ${moment(user_principals.tokenExpirationTime).fromNow()}`);
			}
		});
	} catch (error) {
		console.log(error)
	}
}

function refreshAccessToken() {
	try {
		return new Promise((ok, fail) => {
			const refreshTokenInfo = JSON.parse(fs.readFileSync("./auth/refresh_token.json"));
			const accountInfo = JSON.parse(fs.readFileSync("./auth/account_info.json"));

			const options = {
				url: "https://api.tdameritrade.com/v1/oauth2/token",
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				form: {
					grant_type: "refresh_token",
					access_type: "",
					refresh_token: refreshTokenInfo.refresh_token,
					client_id: accountInfo.client_id,
				},
			};

			//console.log(moment(Date.now()).format(), options.form);
			request(options, function (error, response, body) {
				if (error) console.log(error, response,body);
				let data = JSON.parse(body);
				if (data.error == "Invalid ApiKey") {
					debugger;
					fail(data.error);
				} else if (data.error == "Invalid ApiKey") {
					debugger;
					fail(data.error);
				} else if (data.error == "invalid_grant") {
					debugger;
					fail(data.error);
				} else {
					data.created_on = Date.now();
					data.expires_on = Date.now() + data.expires_in;

					fs.writeFileSync("./auth/access_token.json", JSON.stringify(data, undefined, 4), (err) => {
						if (err) throw err;
					});
					//debugger;
					setTimeout(refreshAccessToken, data.expires_in * 1700)
					ok("Access Token updated. Expires in " + data.expires_in + " seconds");
				}
			});
		});
	} catch (error) {
		fail(error);
		//console.log(error)
	}
	
}

module.exports.getAuthorizationHeader = () => {
	const access_token = JSON.parse(fs.readFileSync("./auth/access_token.json"));
	return {
		Authorization: "Bearer " + access_token.access_token,
	};
}



module.exports.credentials = () => {
	let principals = JSON.parse(fs.readFileSync("./auth/user_principals.json"));
	
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
