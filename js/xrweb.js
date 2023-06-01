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
// var uniqueNames = []; // the list of systems currently online from presence indications
//console.log("addressBook:" + JSON.stringify(addressBook));

var lastamdtext = '';
var b_showLQAData = localStorage.getItem("showlqadata") === "true"; // boolean to toggle display of LQA data real time
//console.log("TOP - showlqadata:" + b_showLQAData);
if(b_showLQAData === null)
	b_showLQAData = false;
var me = localStorage.getItem("uniquename"); // my unique ID, same as controller
var myPosition = localStorage.getItem("position");

var passphrase = localStorage.getItem("passphrase");
if(passphrase === "") {
	openNav();
}
var ipaddress = "radio.radcommsoft.net";
//var ipaddress = "ec2-54-203-203-171.us-west-2.compute.amazonaws.com";
//console.log("ipaddress:" + ipaddress);
//var selFolder = "InBox"; // on open use the InBox folder as the default filter
//var selectedRow = 0;
//var selectedMsgId = 0;
// periodic check of connection status triggered
// by onConnectionLost (start) and onConnect (stop)
var intervalID;

function checkConnection() {
	//alert("check connection...");
	//console.log("checkConnection:" + client.connected);
	//client.connect({ onSuccess: onConnect});
	client.connect({useSSL:true,onSuccess: onConnect,userName:"d_WLo-C.5Xc2GU9J" , password:passphrase});
	
}

var clientid = getTimeStamp().replace(" ", "_");
//console.log("clientid:" + clientid);
client = new Paho.MQTT.Client(ipaddress, Number(9001), "/mqtt", clientid);

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;
// connect the client
client.connect({useSSL:true,onSuccess: onConnect,userName:"d_WLo-C.5Xc2GU9J" , password:passphrase});

// called when the client connects
function onConnect() {
	clearInterval(intervalID);
	//console.log("onConnect...");
	// Once a connection has been made, make subscriptions
	me = localStorage.getItem("uniquename");
	tmp = "Connected to " + ipaddress;
	//document.getElementById("div1").innerHTML = tmp;
	//document.getElementById("chatarea").innerHTML = tmp;
	client.subscribe("address/#");
	client.subscribe("presence/#");
	client.subscribe("chat/send/#");
	document.getElementById("onlineInd").innerHTML = "ONLINE";
	document.getElementById("onlineInd").style.backgroundColor = "cornflowerblue";
	// get the list of aliases from the RFU
	client.send("address/get/" + me + "/ADDRESSES", "", 2, false);
	// get the list of routable messages
	//client.send("queue/cmd/" + me + "/MSGLIST", "", 2, false);
	// get the routing table
	//client.send("routing/cmd/" + me + "/ROUTELIST", "", 2, false);
	// get the version number of the software
	client.send("presence/ind/" + me + "/CONNECTED", "HI!", 0, true);
	client.send("presence/ver/" + me, '', 2, false);
	client.send("presence/get/" + me, "", 2, false);
	//client.send("rfu/cmd/" + me + "/3GTIME", "", 2, false);
	//setTimeout(reloadCICS(), 2000);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
	//console.log("onConnectionLost...");
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
	if(topic.includes("presence/ind"))
	{
		//console.log("presence: " + topic + ":" + res);
		// build table rows
		if(topic.includes("CONNECTED")) {
			var online = (res === "HI!");
			if(document.getElementById(rfu + "Online") == null)
				makePresenceRow(rfu, online);
			else {
				updatePresence(rfu, online);
			}
		}
		else if(me + topic.includes("/VER")) {
			document.getElementById("mename").innerHTML = me + " v. " + res;
		}
		//console.log("RFU: " + rfu + " online: " + online);
	}
	else if(topic.includes("chat/send/" + me)) {
		// i am seding a chat so update the UI element
		var chatarea = document.getElementById("chatarea").innerText;
		//console.log("chat contents:" + chatarea);
		chatarea = chatarea + "\n" + topic + ":" + res;
		//console.log("new chat contents:" + chatarea);
		document.getElementById("chatarea").innerHTML = chatarea;
	}
	else if (topic.includes(me + "/POSITION")) {
		myPosition = res;
		localStorage.setItem("position", myPosition);
		//console.log("POSITION:" + myPosition);
	}	
	else if (topic.includes(me + "/ERROR")){
		if(res.includes("No valid GPS position") || res.includes("XR/IH/VP/CEM/RM50")){
		 	//document.getElementById("position").innerHTML = "NO GPS AVAILABLE";
			 return;
		}
		else {
			printTrace("ERROR: " + res);
		}
	}
	else if (topic.includes("address/ind/" + me + "/ADDRESSES"))
	{
		// store the address book in localStorage
		//console.log("addressBook indication: " + res);
		tmp = res;
		if(tmp === '')
			tmp = "[]";
		localStorage.setItem("addressBook", tmp);
		addressBook = JSON.parse(tmp);
		//loadOtherList();
	}
	else if(topic.includes("/INQUEUE")) {
        curr = document.getElementById(rfu + "Online").innerHTML;
        //console.log("Handle INQUEUE - currtext:" + curr + "-" + res);
        idx = curr.indexOf(":");
		curr = curr.slice(0, idx + 1);
        //console.log("curr: " + curr);
        curr += res;
        document.getElementById(rfu + "Online").innerHTML = curr;
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
	passphrase = tmp;
	localStorage.setItem("passphrase", tmp);
}

function printTrace(toPrint) {
	console.log("Print trace:" + toPrint);
}

function loadOtherList() {
	// first delete the existing lines
	// old = document.getElementById("otherlist"); // a <UL>
	// oldlist = old.getElementsByTagName("LI");
	// //console.log("oldlist:  " + oldlist[0]);
	// // remove existing items from the list
	// length = oldlist.length;
	// //console.log("delete old list items: " + length);
	// for(var i = 0; i < length; i++) {
	// 	oldlist.item(0).remove();
	// }
	list = JSON.stringify(addressBook); // stringify'd JSON Address objects
	//list.sort();
	//console.log("otherlist: " + list);
	// clear both lists
	other = document.getElementById("other"); // a <select> in controller area
	//other1 = document.getElementById("other1"); // a <select> in message area
	otherLen = other.length;
	//console.log("other list length:" + otherLen);
	for (var i = 0; i < otherLen; i++) {
		other.remove(0);
		//other1.remove(0);
	}
	
	JSON.parse(list).forEach(element => { // which is an Address object
		//console.log("element:" + JSON.stringify(element));
		if(element != null)
		{
			// var node = document.createElement("LI");
			// var anchor = document.createElement("A");
			// anchor.onclick = function(){
			// 	document.getElementById("newother").value = element.address;
			// 	document.getElementById("newothername").value = element.frname;
			// };
			// anchor.innerHTML = element.frname + ":" + element.address;
			// node.append(anchor);
			// document.getElementById("otherlist").appendChild(node);
		    // load both UI lists
			var node = document.createElement("option");
			//var node1 = document.createElement("option");
			node.text = element.frname + ":" + element.address;
			//node1.text = element.frname + ":" + element.address;
			other.add(node);
			//other1.add(node1);
		}
	});
	var node = document.createElement("option");
			var node1 = document.createElement("option");
			node.text = "ALL";
			//node1.text = "BCAST:1023";
			other.add(node);
			//other1.add(node1);
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
	document.querySelector("title").innerHTML = 'XRWeb - ' + me;
	if(passphrase === '') {
		openNav();
	}
	makePresenceRow(me, false);
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
	client.send("presence/get/" + rfuname, '', 2, false);
}

function updatePresence(rfuname, online) {
	console.log("updatePresenceRow: " + rfuname + ":" + online);
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
			//client.send("queue/cmd/" + rfuname + "/INQUEUE", "", 2, false);
		}
	}
}

function launchRFU(rfuname) {
	console.log("Launch RFU: " + rfuname);
	localStorage.setItem("uniquename", rfuname);
	me = rfuname;
	var tmp = document.getElementById(rfuname + "Online");
	var cn = tmp.className;
	if(cn.includes("offline")) return;
}

function makePresenceRow(rfuname, online) {
	var table = document.getElementById("presence");
    var row;
    //console.log("rowcount:" + table.rows.length);
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
    //console.log("row:" + row + " useRow:" + useRow + " colCount:" + colCount);
    row = table.rows[useRow];
    var onlinecell = row.insertCell(colCount);
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

// End Connectivity Functions
