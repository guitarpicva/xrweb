var messageList = "{\"queue\":[]}";
var routeList = "{\"routes\":[]}";
var myRecordArray=[];
var myRouteArray=[];

class Address {
	constructor(addrstr, friendly_name){
		this.address = addrstr + ''; // ensure it's a string
		this.frname = friendly_name + ''; // ensure it's a string
	}
}
var calltype = 0;
var addressBook = []; // this will be an array of "Address" objects filled by a topic from the controller on start
var me = localStorage.getItem("uniquename"); // my unique ID, same as controller
var myPosition = localStorage.getItem("position");
var passphrase = localStorage.getItem("passphrase");
if(passphrase === "") {
	openNav();
}
//var ipaddress = "radio.radcommsoft.net";
var ipaddress = "test.mosquitto.org";
//var ipaddress = "ec2-54-203-203-171.us-west-2.compute.amazonaws.com";
console.log("ipaddress:" + ipaddress + " passphrase:" + passphrase);
//var selFolder = "InBox"; // on open use the InBox folder as the default filter
//var selectedRow = 0;
//var selectedMsgId = 0;
// periodic check of connection status triggered
// by onConnectionLost (start) and onConnect (stop)
var intervalID;

function checkConnection() {
	//alert("check connection...");
	//console.log("checkConnection:" + client.connected);
	//client.connect({useSSL:true,onSuccess: onConnect,userName:"d_WLo-C.5Xc2GU9J" , password:passphrase});	
	client.connect({useSSL:true, onSuccess: onConnect});
}

var clientid = getTimeStamp().replace(" ", "_");
//console.log("clientid:" + clientid);
//client = new Paho.MQTT.Client(ipaddress, Number(9001), "/mqtt", clientid);
client = new Paho.MQTT.Client(ipaddress, Number(8081), "/mqtt", clientid);

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;
// connect the client
//client.connect({useSSL:true,onSuccess: onConnect,userName:"d_WLo-C.5Xc2GU9J" , password:passphrase});
client.connect({useSSL:true, onSuccess: onConnect});
// called when the client connects
function onConnect() {
	clearInterval(intervalID);
	console.log("onConnect...");
	// Once a connection has been made, make subscriptions
	me = localStorage.getItem("uniquename");
	tmp = "Connected to " + ipaddress;
	//document.getElementById("div1").innerHTML = tmp;
	//document.getElementById("chatarea").innerHTML = tmp;
	// subscribe to all xrouter topics for testing
	client.subscribe("xrouter/#");
	document.getElementById("onlineInd").innerHTML = "MQTT";
	document.getElementById("onlineInd").style.backgroundColor = "cornflowerblue";
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
	console.log("onConnectionLost...");
	if (responseObject.errorCode !== 0) {
		console.log("MQTT Connection Lost" + responseObject.errorMessage);
		document.getElementById("div1").innerHTML += "<br>Connection to Server : " + client.host + " Lost - " + responseObject.errorMessage;
		printTrace("Connection to Server : " + client.host + " Lost - " + responseObject.errorMessage);
	}
	document.getElementById("onlineInd").innerHTML = "OFFLINE";
	document.getElementById("onlineInd").style.backgroundColor = "darkred";
	intervalID = setInterval(checkConnection, 5000);
}

// called when a message arrives
function onMessageArrived(message) {
	console.log(message.destinationName + ":\n" + message.payloadString);
	//me = document.getElementById("uniquename").value;
	//console.log("onMessageArrived:" + me); // + document.baseURI);
	var res = message.payloadString;
	var topic = message.destinationName;
	var rfu = topic.split("/")[2] + '';
	if(!document.getElementById("div1").hidden) {		
		//console.log(topic + ":" + res);
		document.getElementById("div1").innerHTML += "<br>" + topic + ":" + res;
		document.getElementById("div1").scroll += 40;
	}
	if(topic.includes("xrouter/config")) {
		jason = JSON.parse(res);
		var table = document.getElementById("portstable");			
			
		// if ports list only
		// clear all rows in the table
		if(topic.includes("/ports")) {
			max = table.rows.length; // before removing any rows!
			console.log("max rows: " + max);
			for(i=1;i < max; i++) {
				console.log("remove row..." + i);
				table.rows[1].remove();
			}			
			makePortsRows(jason);			
		}
		else {
			const fields = topic.split('/');
			var rfuname = fields[2];
			console.log("presence stn: " + rfuname)
			// avoid making a button for one that is already there!!!
			if(document.getElementById(rfuname + "Online") == null)
				makePresenceRow(rfuname + '', true);
			makeMainRow(jason);
			makeAddressRow(jason);
			// full config object which also includes "ports" object
			max = table.rows.length; // before removing any rows!
			console.log("full max rows: " + max);
			for(i=1;i < max; i++) {
				console.log("full remove row..." + i);
				table.rows[1].remove();
			}
			jason = JSON.parse(res);
			makePortsRows(jason);			
		}
	}	
}

function openNav() {
	document.getElementById("mySidenav").style.display = "block";
	document.getElementById("passphr").value = localStorage.getItem("passphrase");
}

function closeNav() {
	document.getElementById("mySidenav").style.display = "none";
	// save settings values to localStorage object
	tmp = document.getElementById("passphr").value;
	passphrase = tmp + '';
	// tmp = document.getElementById("callsign").value;
	// localStorage.setItem("uniquename", tmp);	
	// me = tmp; // my unique ID, the viewed station
}

function printTrace(toPrint) {
	console.log("Print trace:" + toPrint);
}

function getTimeStamp() {
	// update the ui
	utc = new Date();
	year = utc.getUTCFullYear();
	month = (utc.getUTCMonth() + 1 + '').padStart(2, 0);//+ year + "-" + month + "-" exit
	ts = "[" + (utc.getUTCDate() + '').padStart(2, 0) + " " + (utc.getUTCHours() + '').padStart(2, 0) + ":" + (utc.getUTCMinutes() + '').padStart(2, 0) + "] ";
	return ts;
}


function updateOther() {
	//console.log("update other");
	document.getElementById("other").value = document.getElementById("other1").value;
}

// function updateOther1() {
// 	//console.log("update other1");
// 	document.getElementById("other1").value = document.getElementById("other").value;
// }

function discbuttonclicked() {
	client.send('rfu/cmd/' + me + "/HANGUP", '', 2, false);
}

function showtracechanged() {
	// Toggle the trace div
	ishidden = document.getElementById("div1").hidden;
	//console.log("show trace? " + ishidden);
	
	document.getElementById("div1").hidden = !ishidden;
	//document.getElementById("buttondiv").hidden = !ishidden;
}

function getDateTimeStamp() {
	// update the ui
	//Date: Sat, 26 Dec 2020 14:52:40 -0500 is the RFC-822 header format
	utc = new Date();

	ts = utc + ''; // make it a string first
	ts = ts.substr(0, ts.indexOf('(') - 1); // truncate worded time zone
	//console.log("ts:" + ts);
	parts = ts.split(' ');
	out = parts[0] + ', ';
	out += parts[1] + ' ';
	out += parts[2] + ' ';
	out += parts[3] + ' ';
	out += parts[4] + ' ';
	out += parts[5].substr(3);
	document.getElementById("TimeStamp").innerHTML = out;
	//console.log("ts:" + out);
	return out;
}

function sendChat(other, chatText) {
	console.log("chat/send/" + me + "/" + other + " : " + chatText);
	client.send("chat/send/" + me + "/" + other, chatText, 2, false);
}

function loadSettings() {
	me = localStorage.getItem("uniquename");
	document.querySelector("title").innerHTML = 'XRouter Web - ' + me;
	if(passphrase === '') {
		openNav();
	}
	// TEST
	//makePresenceRow(me, false);
	//launchRFU(me);
	
	// makePortsRow('{"port":"VHF","type":"Async","descr":"145.730","baud":"1200","mheard":"","l2":""}');
	// END TEST
}

function updateOnlineStatus() {
	//document.getElementById("onlineInd").innerHTML.style.background = "lawngreen";
	document.getElementById("onlineInd").innerHTML.style.background = "cornflowerblue";
	console.log("online:" + document.getElementById("onlineInd").style.backgroundColor);
	document.getElementById("onlineInd").innerHTML = "ONLINE";
}

function updateOfflineStatus() {
	document.getElementById("onlineInd").innerHTML.style.background = "darkred";
	document.getElementById("onlineInd").innerHTML = "OFFINE";
}

function ctrlR() {
	location.reload();
}


function refreshRFU(rfuname) {
	//console.log("Refresh RFU: " + rfuname);
	// this should return multiple topics with all of the data necessary
	// to update the various sections of the page for this station
	client.send("xrouter/get/" + rfuname + "/config", '', 2, false);
}

function updatePresence(rfuname, online) {
	console.log("updatePresence: " + rfuname + ":" + online);
	var button = document.getElementById(rfuname + "Online");
	if(button != null) {
		if(online) {
			button.className = "online onlinebutton white";
            //client.send("presence/ind/" + rfuname + "/INQUEUE", '', 2, false);
		}
		else {
			button.className = "offline onlinebutton white";
			button.style.color = "white";
			document.getElementById(rfuname + "Online").innerHTML = rfuname + ":?";
		}
	}
}

function launchRFU(rfuname) {
	//console.log("Launch RFU: " + rfuname);
	localStorage.setItem("uniquename", rfuname);
	me = rfuname;
	var tmp = document.getElementById(rfuname + "Online");
	var cn = tmp.className;
	if(cn.includes("offline")) return;
	client.send("xrouter/get/" + rfuname + "/config", '', 2, false);
	// here is where we would gather all of the pertinent
	// data to fill the screen or bank
}

function makePresenceRow(rfuname, online) {
	var table = document.getElementById("presence");
    var row = 0;
    console.log("rowcount:" + table.rows.length);
    var rowcount = table.rows.length;
    var useRow = 0;
    var colCount = 0;
    if(rowcount == 0) {
	    row = table.insertRow(0);
    }
    else if(rowcount == 1) {
        //console.log("col count 1:" + table.rows[0].cells.length);
        //colCount = table.rows[0].cells.length;
        useRow = 0;
        if(colCount == 7) {
            row = table.insertRow(1);
            colCount = 0;
            useRow = 1;
        }
        
    }
    else if(rowcount == 2) {
        //console.log("col count 2:" + table.rows[1].cells.length);
        colCount = table.rows[0].cells.length;
        useRow = 1;
        if(colCount == 7) {
            row = table.insertRow(2);
            colCount = 0;
            useRow = 2;
        }
    }
    console.log("rfuname:" + rfuname + " row:" + row + " useRow:" + useRow + " colCount:" + colCount);
    row = table.rows[useRow]; // the row to append the new cell to
    var onlinecell = row.insertCell(-1); // on the end
	onlinecell.className = "prescell button";
	var onlinebutton = document.createElement('button');
	onlinebutton.id = rfuname + "Online";
	onlinebutton.innerHTML = (rfuname);
	if(online) {
		onlinebutton.className = "onlinebutton online white";
	}
	else {
		onlinebutton.className = "onlinebutton offline white";
	}
	onlinebutton.onclick = function(){refreshRFU(rfuname);};
	onlinebutton.ondblclick = function(){launchRFU(rfuname);};
	onlinecell.appendChild(onlinebutton);
}

function makePortsRows(jason) {
	// jason is an array of port objects
	count = jason.ports.length;
	console.log("jason.ports.length: " + count)
	// json is one row of data as a JSON object
	console.log("jason: " + JSON.stringify(jason));
	// jason is a ports object which is an array of object, so loop
	// through the array and get at each object to create table row
	table = document.getElementById("portstable");
    //console.log("rowcount:" + table.rows.length);
	// number of rows BEFORE adding a new ports row
    colCount = 6; // we have 6 cells in each row
	for(j = 0; j < count; j++) {	
	    // make a new row for this port.  rowcount is the index of the next row
		var row = table.insertRow();
    	console.log("make presence row: " + j);
		//row = table.rows[rowcount];
		for (i = 0; i < colCount; i++) {
			//console.log("make cell: " + i);
			var onlinecell = row.insertCell(i);
			onlinecell.className = "prescell button";
			onlinecell.style = 'font-family:Courier, monospace;';
			// this is where the actual cell value would be gathered from MQTT data and set
			switch(i) {
			case 0: onlinecell.innerHTML = jason.ports[j].name + '';break;
			case 1: onlinecell.innerHTML = jason.ports[j].type;break;
			case 2: onlinecell.innerHTML = jason.ports[j].descr;break;
			case 3: onlinecell.innerHTML = jason.ports[j].baud;break;
			case 4: onlinecell.innerHTML = jason.ports[j].MHeard;break;
			case 5: onlinecell.innerHTML = "<a href=''>Stats</a>";break;
			}
		}
	}
}

function makeMainRow(jason) {
	// jason is already parsed JSON object
	table = document.getElementById("maintable");
	var x = table.rows[1].cells;
	var styleit = 'font-family:Courier, monospace;border:1px solid gray'; 
	x[0].style = styleit;
	x[1].style = styleit;
	x[2].style = styleit;
	x[3].style = styleit;
	x[4].style = styleit;
	x[5].style = styleit;
	x[6].style = styleit;
	//x[0].style = 'font-family:Courier, monospace;';
	//console.log("main: x" + x[0].innerHTML + ":" + jason.nodeAlias);
	x[0].innerHTML = jason.nodeAlias + '';
	x[1].innerHTML = jason.chatCall + '';
	x[2].innerHTML = jason.chatAlias + '';
	x[3].innerHTML = jason.qth + '';
	x[4].innerHTML = jason.locator + '';
	x[5].innerHTML = jason.lat + '';
	x[6].innerHTML = jason.lon + '';	
}

function makeAddressRow(jason) {
	// jason is already parsed JSON object
	table = document.getElementById("addresstable");
	var styleit = 'font-family:Courier, monospace;border:1px solid gray'; 
	var a = table.rows[1].cells;
	a[0].style = styleit;
	a[1].style = styleit;
	a[2].style = styleit;
	a[3].style = styleit; 
	//console.log("address: a" + a[0].innerHTML + ":" + jason.software.name);
	a[0].innerHTML = jason.contact + '';
	a[1].innerHTML = jason.comment + '';
	a[2].innerHTML = jason.amprIP + '';
	a[3].innerHTML = jason.software.name + " " +jason.software.version;	
}
// End Connectivity Functions
