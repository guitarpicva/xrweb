//console.log('set base values from localStorage');
var me = localStorage.getItem("uniquename"); // the node's name
var myCallSign = localStorage.getItem('myCallSign') + '';
var myChatName = localStorage.getItem('myChatName') + '';
var myChatChannel = localStorage.getItem('currentChatChannel') + '';
var myPosition = localStorage.getItem("position") + '';
var passphrase = localStorage.getItem("passphrase") + '';
console.log(passphrase + ":" + myCallSign +":" + myChatName);
if(passphrase === "" || myCallSign === "" || myChatName === "") {
	openNav();
}

//var ipaddress = "radio.radcommsoft.net";
var ipaddress = "test.mosquitto.org";
//var ipaddress = "ec2-54-203-203-171.us-west-2.compute.amazonaws.com";
//console.log("ipaddress:" + ipaddress + " passphrase:" + passphrase);

// periodic check of connection status triggered
// by onConnectionLost (start) and onConnect (stop)
var intervalID;

function checkConnection() {
	//alert("check connection...");
	//console.log("checkConnection:" + client.connected);
	//client.connect({useSSL:true,onSuccess: onConnect,userName:"d_WLo-C.5Xc2GU9J" , password:passphrase});	
	client.connect({useSSL:true, onSuccess: onConnect});
}

var clientid = getDateTimeStamp().replace(/ /g, "_").replace(/:/g, "_");
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
	console.log("onConnect..." + document.getElementById("sidebar").className);
	// Once a connection has been made, make subscriptions
	me = localStorage.getItem("uniquename");
	tmp = "Connected to " + ipaddress;
	// subscribe to all xrouter topics for testing
	client.subscribe("xrouter/#");
	document.getElementById("sidebar").className = document.getElementById("sidebar").className.replace(" w3-red", "");
	if(!document.getElementById("sidebar").className.includes(" w3-teal")) {
		document.getElementById("sidebar").className += " w3-teal";
	}
	console.log("Service Worker Ready? " + navigator.serviceWorker.ready);
	//navigator.serviceWorker.ready.then( reg => { reg.showNotification("Connected to " + ipaddress)}); 
	notifyMe();
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
	//console.log("onConnectionLost..." + document.getElementById("sidebar").className);
	if (responseObject.errorCode !== 0) {
		console.log("MQTT Connection Lost" + responseObject.errorMessage);
		var currtext = document.getElementById("trace").innerHTML;
		document.getElementById("trace").innerHTML = getDateTimeStamp() + " - Connection to Server : " + client.host + " Lost - " + responseObject.errorMessage + "<BR>";
		printTrace("Connection to Server : " + client.host + " Lost - " + responseObject.errorMessage);
	}
	//document.getElementById("onlineInd").innerHTML = "OFFLINE";
	document.getElementById("sidebar").className = document.getElementById("sidebar").className.replace(" w3-teal", "");	
	//console.log("after replace: " + document.getElementById("sidebar").className);
	if(!document.getElementById("sidebar").className.includes(" w3-red"))
		document.getElementById("sidebar").className += " w3-red";
	//console.log("after add w3-red: " + document.getElementById("sidebar").className);
	intervalID = setInterval(checkConnection, 5000);
}

// called when a message arrives
function onMessageArrived(message) {
	//console.log(message.destinationName + ":\n" + message.payloadString);
	//me = document.getElementById("uniquename").value;
	//console.log("onMessageArrived:" + me); // + document.baseURI);
	var res = message.payloadString;
	var topic = message.destinationName;
	var rfu = topic.split("/")[2] + '';
	// if(!document.getElementById("div1").hidden) {		
	// 	//console.log(topic + ":" + res);
	// 	document.getElementById("div1").innerHTML += "<br>" + topic + ":" + res;
	// 	document.getElementById("div1").scroll += 40;
	// }
	if(topic.includes("xrouter/config")) {
		jason = JSON.parse(res);
		var table = document.getElementById("portstable");			
			
		// if ports list only
		// clear all rows in the table
		if(topic.includes("/ports")) {
			max = table.rows.length; // before removing any rows!
			//console.log("max rows: " + max);
			for(i=1;i < max; i++) {
				//console.log("remove row..." + i);
				table.rows[1].remove();
			}			
			makePortsRows(jason);			
		}
		else {
			const fields = topic.split('/');
			var rfuname = fields[2];
			//console.log("presence stn: " + rfuname)
			// avoid making a button for one that is already there!!!
			if(document.getElementById(rfuname + "Online") == null)
				makePresenceRow(rfuname + '', true);
			makeMainRow(jason);
			makeAddressRow(jason);
			// full config object which also includes "ports" object
			max = table.rows.length; // before removing any rows!
			//console.log("full max rows: " + max);
			for(i=1;i < max; i++) {
				//console.log("full remove row..." + i);
				table.rows[1].remove();
			}
			jason = JSON.parse(res);
			makePortsRows(jason);			
		}
	}	
	else if(topic.includes("xrouter/event/")) {
		// we got an event which may include a presence indication
		console.log("event: " + topic + " : " + res);
		if(topic.includes("/status")) {
			var parts = topic.split("/");
			var stat = res; // "online" or "offline"
			// if there is no button, make one first
			if(document.getElementById(parts[2] + "Online") == null) 
				makePresenceRow(parts[2], stat);
			else
				console.log("row exists:" + stat);
			// this node is already here so set the color
			var doc = document.getElementById(parts[2] + "Online");
			if(stat === "offline") {				
				console.log("offline: " + parts[2]);	
				if(doc.className.includes("w3-red")) {
					// remove w3-red and add w3-teal
					doc.className.replace("w3-teal", "w3-red");
				}
			}
			else {
				console.log("online: " + parts[2]);	
				if(doc.className.includes("w3-teal")) {
					// remove w3-teal and add w3-red
					doc.className.replace("w3-red", "w3-teal");
				}
			}
			var currtext = document.getElementById("trace").innerHTML;
			var doc = document.getElementById("trace");
			doc.innerHTML = getDateTimeStamp() + " - " + topic + " : " + res + "<BR>" + currtext;
			doc.scrollTop = doc.scrollHeight - doc.clientHeight;
		}
		else if(topic.includes("/chat/")) {
			// chat events need to hit the chattrace element
			var parts = topic.split("/");
			var type = parts[4] + '';
			var jason = JSON.parse(res);
			var doc = document.getElementById('chattrace');
			if(type === "join") {
			    doc.innerHTML += "<br>" + getDateTimeStamp() + " {" + jason.channel + "} [" + jason.user + "] " + jason.name + " has joined the channel";
			}
			else if(type === "msg") {
				var color = '';
				if(jason.user == myCallSign)
					color = "color:blue;"
				doc.innerHTML += "<p style='" + color + "'>" + getDateTimeStamp() + " {" + jason.channel + "} [" + jason.user + "] " + jason.name + " : " + jason.text + "</p>";
			}
			else if(type === "leave") {
				doc.innerHTML += "<br>" + getDateTimeStamp() + " {" + jason.channel + "} [" + jason.user + "] " + jason.name + " has left the channel";
			}
			doc.scrollTop = doc.scrollHeight - doc.clientHeight;
		}
		else {
			var currtext = document.getElementById("trace").innerHTML;
			document.getElementById("trace").innerHTML = getDateTimeStamp() + " - " + topic + " : " + res + "<BR>" + currtext;
		}
	}
	else if(topic.includes("xrouter/status")) {
		if(topic.includes("/routes")) {
			//console.log("ROUTES: " + res);
			var routes = JSON.parse(res);
			var count = routes.length; // num of route entries for loop
			var to_trace = '';
			for (i = 0; i < count; i++) {				
				to_trace += "Route to: " + routes[i].call + " via port: " + routes[i].port + "<BR>";
			}
			var currtext = document.getElementById("trace").innerHTML;
			document.getElementById("trace").innerHTML = to_trace + currtext;
		}
	}
}

function openNav() {
	document.getElementById("mycall").value = localStorage.getItem("myCallSign");
	// document.getElementById("passphr").value = localStorage.getItem("passphrase");
	document.getElementById("mySidebar").style.display = "block";
}

function closeNav() {
	document.getElementById("mySidebar").style.display = "none";
	// save settings values to localStorage object
	tmp = document.getElementById("passphr").value;
	passphrase = tmp + '';
	tmp = document.getElementById("mycall").value;
	myCallSign = tmp;
	localStorage.setItem('myCallSign', myCallSign);
	tmp = document.getElementById("myname").value;
	myChatName = tmp;
	localStorage.setItem('myChatName', myChatName);
	// tmp = document.getElementById("callsign").value;
	// localStorage.setItem("uniquename", tmp);	
	// me = tmp; // my unique ID, the viewed station
}

function openTab(evt, tabName) {
	var i, x, tablinks;
  x = document.getElementsByClassName("tabswitch");
  //console.log("tabswitch: " + x);
  for (i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }
  tabbuttons = document.getElementsByClassName("tabbutton");
  for (i = 0; i < x.length; i++) {
    tabbuttons[i].className = tabbuttons[i].className.replace(" w3-purple", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " w3-purple";
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

function hideShowTrace(id) {
    var x = document.getElementById(id);
    if (x.className.indexOf("w3-show") == -1) {
      x.className += " w3-show";
    } else {
      x.className = x.className.replace(" w3-show", "");
    }
  }

function getDateTimeStamp() {
	// update the ui
	//Date: Sat, 26 Dec 2020 14:52:40 -0500 is the RFC-822 header format
	const utc = new Date();	
	var out = '';
	var day = utc.getUTCDate() + ''; // always 4 chars
	var hr = utc.getUTCHours() + ''; // might be one char so adjust
	if(hr.length < 2) hr = '0' + hr;
	var min = utc.getUTCMinutes() + '';
	if(min.length < 2) min = '0' + min;
	var sec = utc.getUTCSeconds() + '';
	if(sec.length < 2) sec = '0' + sec;
	var ms = utc.getUTCMilliseconds() + '';
	for(i = 0; i < 3- ms.length; i++) 
		ms = '0' + ms;
	out += day + '-' + hr + ':' + min + ':' + sec + '.' + ms;	
	//console.log("out: " + out + ":");	
	return out;
}

function sendChat(channel, chatText) {
	localStorage.setItem('currentChatChannel', channel);
	myChatChannel = channel;
	var jason = '{"sender":"' + myCallSign + '","name":"' + myChatName + '","channel":' + channel + ',"text":"' + chatText + '"}';		
	//console.log("send chat text: " + jason);
	client.send("xrouter/put/" + me + "/chat/msg", jason, 2, false);
	document.getElementById("tosend").value = ''; // clear the text  box
	//document.getElementById("chattrace").innerHTML += "<br>" + getDateTimeStamp() + "&nbsp;{" + channel + "} [" + myCallSign + "] : " + chatText;
//	xrouter/put/G8PZT-1/chat/msg:{"sender":"AB4MW","name":"Mitch","channel":1234,"text":"already done"}

}

function loadSettings() {
	//console.log('loadSettings()');
	me = localStorage.getItem("uniquename") + '';
	var dest = document.getElementById('dest').value;
	dest = localStorage.getItem('currentChatChannel') + '';
	if(dest === '') dest = '1000';
	document.querySelector("title").innerHTML = 'XRouter Web - ' + me;
	if(passphrase === '' || myChatName === '' || myCallSign === '') {
		openNav();
	}
	document.getElementById('mycall').value = myCallSign;
	document.getElementById('myname').value = myChatName;
	document.getElementById('dest').value = myChatChannel;
	document.getElementById("maintab").click();

	// TEST
	//getDateTimeStamp();
	//makePresenceRow(me, false);
	//launchRFU(me);
	
	// makePortsRow('{"port":"VHF","type":"Async","descr":"145.730","baud":"1200","mheard":"","l2":""}');
	// END TEST
}

function updateOnlineStatus() {
	//document.getElementById("onlineInd").innerHTML.style.background = "cornflowerblue";
	document.getElementById("sidebar").className.replace(" w3-red", "");
	document.getElementById("sidebar").className += " w3-teal";
	//console.log("online:" + document.getElementById("onlineInd").style.backgroundColor);	
}

function updateOfflineStatus() {
	document.getElementById("sidebar").className.replace(" w3-teal", "");
	document.getElementById("sidebar").className += " w3-red";
}

function refreshRFU(rfuname) {
	//console.log("Refresh RFU: " + rfuname);
	localStorage.setItem("uniquename", rfuname);
	// this should return multiple topics with all of the data necessary
	// to update the various sections of the page for this station
	client.send("xrouter/get/" + rfuname + "/config", '', 2, false);
	document.getElementById('chattextlabel').innerHTML = "Chat Text via " + rfuname;
}

function updatePresence(rfuname, online) {
	console.log("updatePresence: " + rfuname + ":" + online);
	var button = document.getElementById(rfuname + "Online");
	if(button != null) {
		if(online) {
			button.className = "w3-blue";
            //client.send("presence/ind/" + rfuname + "/INQUEUE", '', 2, false);
		}
		else {
			button.className = "w3-red";
			//button.style.color = "white";
			document.getElementById(rfuname + "Online").innerHTML = rfuname + ":?";
		}
	}
}

function makePresenceRow(rfuname, online) {
	var onlinebutton = document.createElement('button');
	onlinebutton.id = rfuname + "Online";
	onlinebutton.innerHTML = (rfuname);
	if(online === "online") {
		onlinebutton.className = "w3-button w3-teal w3-round-xlarge";
	}
	else {
		onlinebutton.className = "w3-button w3-red w3-round-xlarge";
	}
	onlinebutton.onclick = function(){refreshRFU(rfuname);};
	//onlinebutton.ondblclick = function(){launchRFU(rfuname);};
	//console.log("new presence: " + onlinebutton.id);
	//onlinecell.appendChild(onlinebutton);
	var bar = document.getElementById("presence");
	bar.appendChild(onlinebutton);
	//if(rowcount == 0 && colCount == 0) {
	if(bar.getElementsByTagName('BUTTON').length == 1) {
		// display the first station in the table
		//console.log("refresh only node: " + rfuname);
		refreshRFU(rfuname);
	}
}

function makePortsRows(jason) {
	// jason is an array of port objects
	count = jason.ports.length;
	//console.log("jason.ports.length: " + count)
	// json is one row of data as a JSON object
	//console.log("jason: " + JSON.stringify(jason));
	// jason is a ports object which is an array of object, so loop
	// through the array and get at each object to create table row
	table = document.getElementById("portstable");
    //console.log("rowcount:" + table.rows.length);
	// number of rows BEFORE adding a new ports row
    colCount = 6; // we have 6 cells in each row
	for(j = 0; j < count; j++) {	
	    // make a new row for this port.  rowcount is the index of the next row
		var row = table.insertRow();
		//console.log("make ports row: " + j);
		//row = table.rows[rowcount];
		for (i = 0; i < colCount; i++) {
			//console.log("make cell: " + i);
			var onlinecell = row.insertCell(i);
			onlinecell.className = "prescell button";
			onlinecell.style = 'font-family:Courier, monospace;border:1px solid gray;';
			// this is where the actual cell value would be gathered from MQTT data and set
			switch(i) {
			case 0: onlinecell.innerHTML = jason.ports[j].name + '';break;
			case 1: onlinecell.innerHTML = jason.ports[j].type;break;
			case 2: onlinecell.innerHTML = jason.ports[j].descr;break;
			case 3: onlinecell.innerHTML = jason.ports[j].baud;break;
			case 4: onlinecell.innerHTML = jason.ports[j].MHeard;break;
			case 5: onlinecell.innerHTML = "<a href='javascript:displayRoutes()'>Routes</a>";break;
			}
		}
	}
}

function displayRoutes() {
	if(!document.getElementById("tracediv").className.includes("w3-show"))
		document.getElementById("toggletrace").click();
	var doc = document.getElementById("tracediv");
	doc.scrollTop = doc.scrollHeight - doc.clientHeight;
	//console.log("display routes!");
	client.send("xrouter/get/" + me + "/routes", '', 2, false);

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

// Send a browser notification if allowed
function notifyMe() {
	if (!("Notification" in window)) {
	  // Check if the browser supports notifications
	  alert("This browser does not support desktop notification");
	} else if (Notification.permission === "granted") {
	  // Check whether notification permissions have already been granted;
	  // if so, create a notification
	  const notification = new Notification("Connected to Server");
	  // …
	} else if (Notification.permission !== "denied") {
	  // We need to ask the user for permission
	  Notification.requestPermission().then((permission) => {
		// If the user accepts, let's create a notification
		if (permission === "granted") {
		  const notification = new Notification("Connected to Server!");
		  // …
		}
	  });
	}
	// At last, if the user has denied notifications, and you
	// want to be respectful there is no need to bother them anymore.
  }
  