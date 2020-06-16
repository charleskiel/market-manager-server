const moment = require("moment");
const mysql = require('mysql');
const con = mysql.createConnection({
    host: '360tv.net',
    user: 'root',
    password: 'Alabama!9044013083828789',
    database: 'marketmanager'
});

function load(){
	con.connect(function(err) {
		if (err) throw err;
		//console.log("Connected!");
	   });
	   
	   
	con.query(`select * from ACTIVES_OPTIONS order by timestamp desc LIMIT 1`, function (error, results){
		console.log(results[0].content)
		m = JSON.parse(results[0].content)
		//console.log(moment(Date.now()).format() + ": OPTIONS Activies")
		//console.log(moment(Date.now()).format() + m)
		console.log(m["1"])
		var split = m["1"].split(";")
		console.log(split)
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
		    //if (!this.state[split[i]]) this.stockTickerSubscribe([split[i]])
		    o.groups.push({symbol: split[i], name: split[i+1], volume: split[i+2], percentChange: split[i+3]})
		}
		console.log(o);
		//console.log(moment(Date.now()).format() + msg);
																					})
}
//INSERT INTO ACTIVES_OPTIONS (key,timestamp,content) VALUES ('OPTS-DESC-ALL', 1589857748306, '{\"1\":\"83348;0;23:9:00;23:09:08;2;0:10:4071937:SPY_051820C295:SPY May 18 2020 295 Call:11945:0.29:SPY_051820C296:SPY May 18 2020 296 Call:11507:0.28:SPY_051820P295:SPY May 18 2020 295 Put:10691:0.26:AAPL_052220C320:AAPL May 22 2020 320 Call:10655:0.26:DIS_052220C120:DIS May 22 2020 120 Call:8960:0.22:SPY_051820P293:SPY May 18 2020 293 Put:8930:0.22:SPY_051820P294:SPY May 18 2020 294 Put:8671:0.21:AAPL_052220C315:AAPL May 22 2020 315 Call:8631:0.21:BA_052220C135:BA May 22 2020 135 Call:8445:0.21:SPY_052220C300:SPY May 22 2020 300 Call:7511:0.18;1:10:30047279:SPY_051820C296:SPY May 18 2020 296 Call:190020:0.63:SPY_051820P295:SPY May 18 2020 295 Put:177112:0.59:SPY_051820C295:SPY May 18 2020 295 Call:157861:0.53:SPY_051820P294:SPY May 18 2020 294 Put:148029:0.49:SPY_051820P293:SPY May 18 2020 293 Put:136243:0.45:SPY_051820C297:SPY May 18 2020 297 Call:112160:0.37:GE_121820C7:GE Dec 18 2020 7 Call:106223:0.35:GE_082120C12:GE Aug 21 2020 12 Call:101158:0.34:ET_061920C9:ET Jun 19 2020 9 Call:89955:0.3:SPY_052020C300:SPY May 20 2020 300 Call:79712:0.27\",\"key\":\"OPTS-DESC-ALL\"}')

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
 

load()