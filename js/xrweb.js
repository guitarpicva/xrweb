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
	document.getElementById("div1").innerHTML = tmp;
	document.getElementById("chatarea").innerHTML = tmp;
	client.subscribe("rfu/ind/#"); // i send local indications also sometimes, mainly errors
	//client.subscribe("msg/+/#");
	//client.subscribe("queue/#");
	//client.subscribe("routing/ind/#");
	client.subscribe("ale/#");
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
	client.send("presence/ver/" + me, '', 2, false);
	client.send("presence/get/" + me, "", 2, false);
	//client.send("rfu/cmd/" + me + "/3GTIME", "", 2, false);
	//setTimeout(reloadCICS(), 2000);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
	console.log("onConnectionLost...");
	if (responseObject.errorCode !== 0) {
		console.log("MQTT Connection Lost");
		document.getElementById("div1").innerHTML += "<br>Connection to Server : " + client.host + " Lost - " + responseObject.errorMessage;
		printTrace("Connection to Server : " + client.host + " Lost - " + responseObject.errorMessage);
	}
	document.getElementById("onlineInd").innerHTML = "OFFLINE";
	document.getElementById("onlineInd").style.backgroundColor = "darkred";
	intervalID = setInterval(checkConnection, 5000);
}

// called when a message arrives
function onMessageArrived(message) {
	console.log(message.destinationName + ":<br>" + message.payloadString);
	//me = document.getElementById("uniquename").value;
	//console.log("onMessageArrived:" + me); // + document.baseURI);
	var res = message.payloadString;
	var topic = message.destinationName;
	var rfu = topic.split("/")[2] + '';
	if(!document.getElementById("div1").hidden) {
		if (!topic.includes("/SCAN") && !topic.includes("/LINK") && !topic.includes("/POSITION")){ // && !topic.includes("/TIME") 
			//console.log(topic + ":" + res);
			document.getElementById("div1").innerHTML += "<br>" + topic + ":" + res;
			document.getElementById("div1").scrollTop += 40;
		}
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
	// if (topic.includes("/TIME")) {document.getElementById("TIME").innerHTML = res;}
	else if(topic.includes("rfu/ind") && topic.includes("/3GTIME")) {
		var bgcolor = "darkred";
		//console.log("3GTIME: " + rfu + ": " + res);
		if(res < 5) { bgcolor = "springgreen";}
		else if(res < 7) { bgcolor = "rebeccapurple";}
		else { bgcolor = "darkred";}
		if(rfu === me) {
			document.getElementById("TOD").style.backgroundColor = bgcolor;
		}
		var but = document.getElementById(rfu + "Online");
		if(but != null) {
			but.style.color = bgcolor;
		}
	}
	else if (topic.includes("rfu/ind") && topic.includes("/LINK")) {
		console.log("LINK STATE: " + res);
		dontupdate = (document.getElementById("linked").innerHTML.includes("-&gt;") == true);
		if(rfu === me) {
			if (res.includes("CLOSED")) {
				console.log("LINK IS CLOSED");
				dontupdate = false;
				document.getElementById("linked").innerHTML = "LINK: CLOSED";
				// do we really need this?
			    client.send('rfu/cmd/' + me + '/SCAN', '', 2, false);
				var todcolor = document.getElementById("TOD").style.backgroundColor;
				//console.log("bgcolor: " + todcolor);
				document.getElementById(me + "Online").style.color = todcolor;
			}
			//console.log("update: " + dontupdate + ":" + document.getElementById("linked").innerHTML);
			// if (dontupdate == false) {
			// 	console.log("DON'T UPDATE IS FALSE");
			// 	document.getElementById("linked").innerHTML = ("LINK: " + res.toUpperCase());
			// }
		}
		// else { // update all presence buttons
			if(res.includes("CLOSED")) {
				document.getElementById(rfu + "Online").className = "onlinebutton notlinked";	
			}
			else {
				document.getElementById(rfu + "Online").className = "onlinebutton linked";
			}
		// }
	}
	else if (topic.includes("rfu/ind") && topic.includes("/SCAN")) {
		if (res === 'ON') {
			if(rfu === me) {
				document.getElementById("SCANButton").innerHTML = "SCAN: ON";
				document.getElementById("FREQ").innerHTML = "SCANNING";
			}
			// document.getElementById(rfu + "Scan").className = "selected ind";
		}
		else {
			if(rfu === me) {
				document.getElementById("SCANButton").innerHTML = "SCAN: OFF";
			}
			// document.getElementById(rfu + "Scan").className = "offline ind";
		}
	}
	else if (topic.includes(me + "/CHAN")) {
	// 	//console.log("curr chan:" + res);
	// 	item = -1;
	// 	var s = document.getElementById("channelList").options;
	// 	max = s.length;
	// 	for(var i = 0; i < max; i++) {
	// 		//console.log("item:" + res.trim() + ":" + s[i].text);
	// 		if(s[i].text === res.trim()) {
	// 			//console.log("MATCH! " + i);
	// 			break;
	// 		}
	// 	}
		document.getElementById("channel").innerHTML = res;
	}
	else if (topic.includes(me + "/FREQ")) {
		if (document.getElementById("SCANButton").innerHTML.includes('OFF')) {
			res = res.slice(0, res.length-3) + "." + res.slice(-3);
			document.getElementById("FREQ").innerHTML = res;
		}
		//console.log("FREQ:" + res);
	}
	else if(topic.includes(me + "/LQAXCHG")) {
		console.log("LQAXCHG: " + res);
		var parts = res.split(",");
		printTrace(getTimeStamp() + "LQAXCHG FROM " + parts[0] + " CH " + parts[1]);
	}
	else if (topic.includes(me + "/Local_")) {
		// this holds  Local_SNR
		parts = topic.split("/");
		//console.log("Local LQA:" + topic + ":" + parts + " show? " + b_showLQAData);
		heard = parts[4];
		function getAddrItem(name)
		{
			//console.log("entry:" + name.address + "-" + name.frname);
			if(name == null)
			return null;
			else
			return name.address === heard;
		}
		heardName = addressBook.find(getAddrItem);
		if(heardName == null) {
			addr = "?"; alias = "?";
		}
		else {
			addr = heardName.address;
			alias = heardName.frname;
		}
		//console.log("heardName:" + heardName.frname);
		now = new Date();
		var hrs = now.getUTCHours() + '';
		if(hrs.length == 1) hrs = "0" + hrs;
		var min = now.getUTCMinutes() + '';
		if(min.length == 1) min = "0" + min;
		var stamp = "[" + hrs + ":" + min + "] ";
		//console.log("LQA Date:" + min.length);
		chan = parts[5];
		if (b_showLQAData && topic.includes("_SNR")){
			lqaval = stamp + "HEARD " + addr + ":" + alias + " on " + chan + " SINAD: " + res + " dB";
			printTrace(lqaval);
		}
		// document.getElementById("heard").innerHTML = heard;
		// document.getElementById("heardchan").innerHTML = chan;
		// if (topic.includes("_SNR")) {
		// 	document.getElementById("snrlabel").innerHTML = res + ' dbm';
		// }
		document.getElementById("channel").innerHTML = chan;
		//client.send('rfu/cmd/' + me + '/FREQ', '', 2, false);
	}
	else if (topic.includes(me + "/Remote_")) {
		// this holds either Remote_BER or Remote_SNR
		parts = topic.split("/");
		//console.log("Remote LQA:" + topic + ":" + parts + " show? " + b_showLQAData);
		heard = parts[4];
		function getAddrItem(name)
		{
			//console.log("entry:" + name.address + "-" + name.frname);
			if(name == null)
			return null;
			else
			return name.address === heard;
		}
		heardName = addressBook.find(getAddrItem);
		if(heardName == null) {
			addr = "?"; alias = "?";
		}
		else {
			addr = heardName.address;
			alias = heardName.frname;
		}
		//console.log("heardName:" + heardName.frname);
		now = new Date();
		var hrs = now.getUTCHours() + '';
		if(hrs.length == 1) hrs = "0" + hrs;
		var min = now.getUTCMinutes() + '';
		if(min.length == 1) min = "0" + min;
		var stamp = "[" + hrs + ":" + min + "] ";
		//console.log("LQA Date:" + min.length);
		chan = parts[5];
		if (b_showLQAData && topic.includes("_SNR")){
			lqaval = stamp + "HEARING " + addr + ":" + alias + " on " + chan + " SINAD: " + res + " dB";
			printTrace(lqaval);
		}
		// document.getElementById("heard").innerHTML = heard;
		// document.getElementById("heardchan").innerHTML = chan;
		// if (topic.includes("_SNR")) {
		// 	document.getElementById("snrlabel").innerHTML = res + ' dbm';
		// }
		document.getElementById("channel").innerHTML = chan;
		//client.send('rfu/cmd/' + me + '/FREQ', '', 2, false);
	}
	else if (topic.includes(me + "/ALE-LINK")) { // rfu/ind/linchpin/ALE-LINK:-,321,391,27/01 18:47
		tmp = res;
		console.log("ALE-LINK tmp:" + tmp + ":");
		if (tmp != '') {
			if (tmp.includes('FAILED')) {
				if(topic.includes(me)) {
					printTrace("ALE-LINK: " + res);
				}
				document.getElementById(rfu + "Online").className = "onlinebutton notlinked";
			}
			else {
				// tmp 0=chan, 1=source, 2=dest, 3=timestamp, 4 (opt)= chat text
				document.getElementById(rfu + "Online").className = "onlinebutton linked";
				tmp = res.split(",");
				chan = tmp[0].trim();
				dest = tmp[2].trim();
				source = tmp[1].trim();
				amdtext = '';
				if (tmp.length > 4)
					amdtext = tmp[4].trim();
				if(topic.includes(me)) {
					document.getElementById("linked").innerHTML = "LINK: " + source + "->" + dest;
					//document.getElementById("farny").play();
					ts = getTimeStamp();
					//if(source === document.getElementById("selfid").value) {return;}
					if (tmp.length > 4) {
						printTrace(ts + " LINK FM: " + source + " TO: " + dest + "<br>" + amdtext);
					}
					else {
						printTrace(ts +" LINK FM: " + source + " TO: " + dest);
					}
				}
			}
		}
	}
	else if(topic.includes(me + "/PAGE-CALL-ACK")) { //rfu/ind/linchpin/PAGE-CALL-ACK:CH 24,    391,    321, 27/01 18:47
		tmp = res;
		console.log("PAGE-CALL-ACK: " + tmp);
		if (tmp != '') {
			if (tmp.includes('FAILED')) {
				printTrace("PAGE-CALL: " + res);
			}
			else {
				// tmp 0=chan, 1=dest, 2=source, 3=timestamp, 4 (opt)= chat text
				tmp = res.split(",");
				dest = tmp[2].trim();
				source = tmp[1].trim();
				amdtext = '';
				if (tmp.length > 4)
					amdtext = tmp[4].trim();
				document.getElementById("linked").innerHTML = "LINK: " + source + "->" + dest;
				//document.getElementById("farny").play();
				ts = getTimeStamp();
				// if (tmp.length > 4) {
				// 	printTrace(ts + " [ACK FM: " + source + " TO: " + dest + "]<br>" + amdtext);
				// }
				// else {
					// printTrace(ts +" [ACK FM: " + source + " TO: " + dest + "]");
				// }
				document.getElementById("chatarea").innerHTML += (" [*]");
				document.getElementById("linked").innerHTML = "LINK: CLOSED";
			}
		}
	}
	else if(topic.includes(me + "/SOUND")) {
		console.log("SOUND: " + res);
		var parts = res.split(",");
		printTrace(getTimeStamp() + "SOUNDING FROM " + parts[0] + " CH " + parts[1]);
	}
	// else if(topic.includes(me + "/SOUNDING")){
	// 	if(topic.includes("FINISHED")){
	// 		printTrace("SOUNDING: FINISHED " + getDateTimeStamp());
	// 	}
	// 	else if(topic.includes("STARTED")){
	// 		printTrace("SOUNDING: STARTED " + getDateTimeStamp() + " as " + res);
	// 	}

	// }
	// else if (topic.includes(me + "/RM50_CRYPTO"))
	// 	document.getElementById("RM50_CRYPTO").innerHTML = 'Crypto:' + res;
	// else if (topic.includes(me + "/DV")) // catches all DV related topics
	// {
	// 	if (topic.includes("/DV_RATE"))
	// 	{
	// 		document.getElementById("DV_RATE").value = res;
	// 	}
	// 	else if (topic.includes("/DV_INSTALLED")){
	// 		if(res == 'true'){
	// 			document.getElementById("DV").value = "DV:?";
	// 			document.getElementById("DV").disabled = false;
	// 		}
	// 		else{
	// 			document.getElementById("DV").value = "DV:N/A";
	// 			document.getElementById("DV").disabled = true;
	// 		}
	// 	}
	// 	else {
	// 		document.getElementById("DV").innerHTML = 'DV:' + res;
	// 	}	
	// }			
	// else if (topic.includes(me + "/Product_Type"))
	// 	document.getElementById("radiotype").innerHTML = res;
	else if (topic.includes(me + "/POSITION")) {
		myPosition = res;
		localStorage.setItem("position", myPosition);
		//console.log("POSITION:" + myPosition);
	}
	// else if (topic.includes(me + "/ESN")) {
	// 	document.getElementById("ESN").innerHTML = res;
	// 	document.getElementById("mename").innerHTML = me;
	// 	console.log("ESN:" + res);
	// }
	else if (topic.includes("rfu/ind/" + me + "/MESSAGE/")) { //"rfu/ind/linchpin/MESSAGE/1004/1000" : "i know, thats annoying right?"
		console.log(topic + " - message:" + res);
		items = topic.split("/");
		source = items[4];
		dest = items[5];
		// msgparts = res.split(" ");
		// count = msgparts[0].length;
		// count += msgparts[1].length;
		// count += 2; // start of payload of chat text
		ts = getTimeStamp();
		printTrace(ts + " [MSG FROM: " + source + " TO: " + dest + "]<br/>" + res);
		client.send('rfu/cmd/' + me + '/SCAN', '', 2, false);
	}
	else if (topic.includes(me + "/SELFID")) {
		//console.log("SELFID indication: " + res);
		// sel = document.getElementById("selfid"); // a single address
		// sel.value = res;
		localStorage.setItem("ALESELFID", res);

		// max = sel.length;
		// for (var i = 0; i < max; i++) {
		// 	sel.remove(0);
		// }
		// //console.log("empty? sel.length=" + sel.length);
		// items = res.split(",");
		// //console.log("items:" + Array.isArray(items) + ":" + items);
		// items.forEach(loadSelfId);
		// function loadSelfId(item) {
		// 	//console.log("selfid:" + item);
		// 	option = document.createElement("option");
		// 	option.text = item.trim();
		// 	sel.add(option);
		// }
	}
	// else if (topic.includes(me + "/STATUS-CALL-ACK")) {
	// 	ts = getTimeStamp();
	// 	console.log("status call ack: " + ts);
	// 	printTrace("Status Call Ack (TOD) [" + ts + "] -- " + res);
	// }
	// else if (topic.includes("msg/ind/" + me + "/LIST/")) {
	// 	//console.log("msg/LIST:" + res);
	// 	selFolder = topic.split("/")[4];
	// 	messageList = res;
	// 	// loop through the JSON to load the TR's in id="msglist" table
	// 	// first clear the existing table contents
	// 	loadMessageList();
	// }
	// else if (topic.includes("rfu/ind/" + me + "/channels")) {
	// 	//console.log("rfu/ind/me/channels:");
	// 	var sel = document.getElementById("channelList"); // a select element
	// 	max = sel.length;
	// 	for (var i = 0; i < max; i++) {
	// 		sel.remove(0);
	// 	}
	// 	//console.log("sel.length=" + sel.length);
	// 	items = res.split(",");
	// 	//console.log("items:" + Array.isArray(items) + ":" + items);
	// 	items.forEach(loadChannelItem);
	// 	function loadChannelItem(item) {
	// 		//console.log("channel:" + item);
	// 		option = document.createElement("option");
	// 		option.text = item;
	// 		option.id = item;
	// 		sel.add(option);
	// 	}
	// 	// max = sel.length;
	// 	// for (var i = 0; i < max; i++) {
	// 	// 	console.log("VALUES: " + sel[i].value);
	// 	// }
	// 	sel.selectedIndex = 0;
	// }
	// else if(topic.includes("queue/ind/" + me + "/LIST")) {
	// 	//console.log("queue list indication: " + res);
	// 	tmp = res;
	// 	if(tmp === '')
	// 		tmp = "[]";
	// 	localStorage.setItem("queue", tmp);
	// 	messageList = tmp;
	// 	loadMessageList();
	// }
	// else if(topic.includes("routing/ind/" + me + "/LIST")) {
	// 	//console.log("route list indication: " + res);
	// 	tmp = res;
	// 	if(tmp === '')
	// 		tmp = "[]";
	// 	localStorage.setItem("routes", tmp);
	// 	routeList = tmp;
	// 	loadRoutingTable();
	// }
	// else if(topic.includes("message/details/" + me))
	// {
	// 	//console.log(topic + " : " + res);
	// 	printTrace(res);
	// 	reloadMessages();
	// }
	// else if (topic.includes("msg/ind/" + me + "/MOVED")) {
		
	// 	reloadMessages();
	// }
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
		loadOtherList();
	}
	// else if(topic.includes(me + "/KEY_PREFIX")) {
	// 	document.getElementById("keyprefix").innerHTML = res.toLowerCase();
	// }
	// else if(topic.includes(me + "/KEY_INDEX")) {
	// 	//val = String(res);
	// 	//console.log("selected key: " + res + ":" + val);
	// 	document.getElementById("cryptokeys").selectedIndex = res;
	// }
	// else if(topic.includes(me + "/KEY_COUNT")) {
	// 	let sel = document.getElementById("cryptokeys");
	// 	let list = sel.options; // a select
	// 	// delete all from list to refresh it
	// 	//console.log("list:" + list);
	// 	let len = list.length;
	// 	for(var i = 0; i < len; i++) {
	// 		list.remove(0);
	// 	}
	// 	len = res;
	// 	//console.log("key count:" + len);
	// 	for (i = 0; i < len; i++) {
	// 		let visual = i + '';
	// 		visual = visual.padStart(3, 0);
	// 		option = document.createElement("option");
	// 		option.text = visual;
	// 		sel.add(option);
	// 	}
	// 	document.getElementById("cryptokeys").options = list;
	// }
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
	//document.getElementById("mySource").value = localStorage.getItem("mySource");
	//document.getElementById("selfid").value = localStorage.getItem("ALESELFID");
	//document.getElementById("uniquename").value = localStorage.getItem("uniquename");
	tmp = localStorage.getItem("showlqadata");
	if(tmp === null) {
		tmp = "OFF";
		b_showLQAData = false;
		localStorage.setItem("showlqadata", b_showLQAData);  // failsafe set to off
	}
	tmp = b_showLQAData?"toggle LQA data display: ON":"toggle LQA data display: OFF";
	//console.log(tmp);	
	//document.getElementById("showlqadata").innerHTML = tmp;
	// now display the known list of other addresses
	document.getElementById("passphr").value = localStorage.getItem("passphrase");
	loadOtherList();
}

function closeNav() {
	document.getElementById("mySidenav").style.display = "none";
	// save settings values to localStorage object
	// tmp = document.getElementById("selfid").value;
	// if(tmp !== ''){
	// 	localStorage.setItem("ALESELFID", tmp);
	// 	document.getElementById("selfid").value = tmp;
	// }
	// tmp = document.getElementById("uniquename").value;
	// if(tmp !== ''){
	// 	localStorage.setItem("uniquename", tmp);
	// 	document.getElementById("uniquename").value = tmp;
	// }
	// tmp = document.getElementById("mySource").value;
	// if(tmp !== ''){
	// 	localStorage.setItem("mySource", tmp);
	// 	document.getElementById("Source").value = tmp;
	// }
	// tmp = document.getElementById("showlqadata").innerHTML;
	// if(tmp.includes("ON")) {
	// 	localStorage.setItem("showlqadata", true);
	// }
	// else {
	// 	localStorage.setItem("showlqadata", false);
	// }
	tmp = document.getElementById("passphr").value;
	passphrase = tmp;
	localStorage.setItem("passphrase", tmp);
	//console.log("pp:" + tmp);
	// document.getElementById("newother").value = "";
	// document.getElementById("newothername").value = "";
	loadOtherList();
}

function printTrace(toPrint) {
	//console.log("Print trace:" + toPrint);
	document.getElementById("chatarea").innerHTML += ("<br/>" + toPrint);
	//console.log("scrollTop: " + document.getElementById("chatarea").scrollHeight);
	//document.getElementById("chatarea").scrollTop = document.getElementById("chatarea").scrollHeight;
	document.getElementById("chatarea").scrollIntoView(false);
}

function clearchat(){
	document.getElementById("chatarea").innerHTML = '';
}

// function reloadCICS() {
// 	me = localStorage.getItem("uniquename"); // my unique ID, same as controller
// 	if (me === "") {
// 		console.log("reload: uniquename is empty");
// 		me = localStorage.getItem("uniquename");
// 		document.getElementById("uniquename").value = me;
// 		if (me === '')
// 			openNav();
// 		return;
// 	}
// 	// clear any existing values from the UI display
// 	document.getElementById("SCANButton").innerHTML = "SCAN:?";
// 	document.getElementById("channel").innerHTML = "-";
// 	document.getElementById("FREQ").innerHTML = "-";
// 	//document.getElementById("TIME").innerHTML = "-:-";
// 	//document.getElementById("EasiTalk").innerHTML = "EasiTalk:?";
// 	//document.getElementById("DV").innerHTML = "DV:?";
// 	//document.getElementById("RM50_CRYPTO").innerHTML = "Crypto:?";
// 	// ask for all new values for the UI to display
// 	client.send('rfu/cmd/' + me + '/reload', '', 2, false);
// 	//client.send('rfu/cmd/' + me + '/getmodes', '', 2, false);
// 	client.send('rfu/cmd/' + me + '/getchannels', '', 2, false);
// 	client.send('rfu/cmd/' + me + '/SELFID', '', 2, false);
// 	//client.send('ale/get/' + me + '/OTHER_LIST', '', 2, false); // defunct with address book
// 	//client.send('presence/ver/' + me, '', 2, false);
// }

function toggleScan() {
	//me = document.getElementById("uniquename").value.trim();

	if (document.getElementById("SCANButton").innerHTML.includes('ON'))
		client.send('rfu/cmd/' + me + '/SCAN', 'OFF', 2, false);
	else {
		client.send('rfu/cmd/' + me + '/SCAN', 'ON', 2, false);
		document.getElementById("SCANButton").innerHTML = "SCAN: ON";
	}
}

// function toggleDV() {
// 	//me = document.getElementById("uniquename").value.trim();
// 	if(document.getElementById("DV").value === 'DV:N/A'){
// 		return;
// 	}
// 	if (document.getElementById("DV").innerHTML.includes('ON'))
// 		client.send('rfu/cmd/' + me + '/DV', 'OFF', 2, false);
// 	else
// 		client.send('rfu/cmd/' + me + '/DV', 'ON', 2, false);
// }

// function muteSelected() {
// 	//me = document.getElementById("uniquename").value.trim();
// 	state = document.getElementById("MUTE").value;
// 	console.log("muteSelected:" + state);
// 	client.send('rfu/cmd/' + me + '/MUTE', state, 2, false);
// }

// function toggleEasiTalk() {
// 	//me = document.getElementById("uniquename").value.trim();

// 	if (document.getElementById("EasiTalk").innerHTML.includes('ON'))
// 		client.send('rfu/cmd/' + me + '/EasiTalk', 'OFF', 2, false);
// 	else
// 		client.send('rfu/cmd/' + me + '/EasiTalk', 'ON', 2, false);
// }

// function powerSelected() {
// 	//me = document.getElementById("uniquename").value.trim();
// 	pwr = document.getElementById("RFPOWER").value;
// 	//console.log("powerSelected:" + pwr.toLowerCase());
// 	client.send('rfu/cmd/' + me + '/RFPOWER', pwr.toLowerCase(), 2, false);
// }

// function modeSelected() {
// 	//me = document.getElementById("uniquename").value.trim();
// 	mode = document.getElementById("MODE").value;
// 	//console.log("powerSelected:" + pwr);
// 	client.send('rfu/cmd/' + me + '/MODE', mode, 2, false);
// }

// function dvRateSelected() {
// 	if(document.getElementById("DV").value === 'DV:N/A'){
// 		return;
// 	}
// 	//me = document.getElementById("uniquename").value.trim();
// 	rate = document.getElementById("DV_RATE").value;
// 	//console.log("dvRateSelected:" + rate);
// 	client.send('rfu/cmd/' + me + '/DV_RATE', rate, 2, false);
// }

// function channelSelected() {
// 	channel = document.getElementById("channelList").value.trim();
// 	//console.log("channelSelected:" + channel);
// 	client.send('rfu/cmd/' + me + '/SCAN', "OFF", 2, false);
// 	client.send('rfu/cmd/' + me + '/CHAN', channel, 2, false);
// }

// function toggleCrypto() {
// 	//me = document.getElementById("uniquename").value.trim();
// 	// if it shows on, send the OFF command, and vice versa
// 	if (document.getElementById("RM50_CRYPTO").innerHTML.includes('ON')) {
// 		//document.getElementById("cryptokeys").disabled = true;
// 		client.send('rfu/cmd/' + me + '/RM50_CRYPTO', 'OFF', 2, false);
// 	}
// 	else {
// 		//document.getElementById("cryptokeys").disabled = false;
// 		client.send('rfu/cmd/' + me + '/RM50_CRYPTO', 'ON', 2, false);
// 	}
// }

// function keyselected() {
// 	// user has chosen a key, so tell the RFU to use it
// 	let keynum = Number(document.getElementById("cryptokeys").value);
// 	console.log("crypto key: " + keynum);
// 	client.send('rfu/cmd/' + me + '/KEY_INDEX', String(keynum), 2, false);
// }

function nextChannel() {
	//me = document.getElementById("uniquename").value.trim();
	client.send('rfu/cmd/' + me + '/CHAN/UP', '', 2, false);
}

function prevChannel() {
	//me = document.getElementById("uniquename").value;
	client.send('rfu/cmd/' + me + '/CHAN/DOWN', '', 2, false);
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

function makeLink() {
	//me = document.getElementById("uniquename").value.trim();
	// calltype is a global which must be set by the calling function
	otheraddr = document.getElementById("other").value;
	otheraddr = otheraddr.split(":")[1]; // the numerical address
	//onsole.log("otheraddr:" + otheraddr);
	if(otheraddr === '') otheraddr = "1004";
	amdtext = document.getElementById("amdtext").value.trim();
	amdtext = amdtext.replace(/\n/g, "\r\n");
	selfaddr = localStorage.getItem("ALESELFID");
	if (amdtext.length > 0) {
		// sanitize amdtext and update the ui
		amdtext = amdtext.replace(/'/g, "-");
		lastamdtext = amdtext;
		ts = getTimeStamp();
		//console.log("timestamp: " + ts);
		console.log("TEXT: " + amdtext);
		//self = document.getElementById("selfid").value;
		printTrace(ts + " [SENDING FM: " + selfaddr + " TO: " + otheraddr + "] -- " + amdtext);
	}
	document.getElementById("amdtext").value = '';
	if (calltype > 2) {
		//console.log("LQA or SOUND" + calltype);
		if (calltype == 4) {
			client.send('rfu/cmd/' + me + '/SOUND_NOW', '', 2, false);
			document.getElementById("FREQ").innerHTML = "SOUNDING";
			return;
		}
		else if (calltype == 5) {
			console.log("ALLCALL");
			if (document.getElementById("SCANButton").innerHTML === "SCAN:ON") {
				printTrace("Must choose a channel first...");
				document.getElementById("FREQ").innerHTML = "ALLCALL";
				return;
			}
			// ALLCALL
			thechannel = document.getElementById("CHAN").value;
			client.send('rfu/cmd/' + me + '/ALLCALL', amdtext, 2, false);
		}
		else { // calltype = 3, LQA update
			if (otheraddr === '') {
				client.send('rfu/ind/' + me + '/ERROR', 'OTHER address missing', 2, false);
				document.getElementById("FREQ").innerHTML = "LQA UPDATE";
				return;
			}
			client.send('rfu/cmd/' + me + '/LQA_UPDATE', otheraddr, 2, false);
			return;
		}
	}
	if (otheraddr === '') {
		client.send('rfu/ind/' + me + '/ERROR', 'OTHER address missing', 2, false);
		return;
	}
	//console.log("other:" + otheraddr);
	
	if (selfaddr === '') {
		client.send('rfu/ind/' + me + '/ERROR', 'SELF address missing', 2, false);
		return;
	}
	document.getElementById("SCANButton").innerHTML = "SCAN:OFF";
	if (calltype == 2) {
		// send a TOD REQUEST
		client.send("rfu/cmd/" + me + "/3G_TOD_REQ", otheraddr, 2, false);
	}
	else if(calltype == 0){
		// a normal data link assumes data to send chat/msgblock
		client.send('rfu/cmd/' + me + '/ALECALL/DATA/' + selfaddr + '/' + otheraddr, amdtext, 2, false);
	}
	else {
		// a normal voice link
		client.send('rfu/cmd/' + me + '/ALECALL/VOICE/' + selfaddr + '/' + otheraddr, amdtext, 2, false);
	}
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
	//console.log("show trace? " + dotrace.checked);
	ishidden = document.getElementById("div1").hidden;
	document.getElementById("div1").hidden = !ishidden;
	document.getElementById("buttondiv").hidden = !ishidden;
}

function showlqadatachanged() {
	b_showLQAData = !b_showLQAData;
	tmp = (b_showLQAData?"ON":"OFF");
	//console.log("SHow LQA? " + tmp);
	document.getElementById("showlqadata").innerHTML = "toggle LQA data display: " + tmp;
}
// // Routing table functions
// function loadRoutingTable() {
// 	//console.log("loadRoutingTable:" + routeList);
// 	rowset = document.getElementById("routelist"); // get the routing table div
// 	//console.log("rowset:" + rowset);
// 	myRoutes = JSON.parse(routeList); // an object containing an array
// 	myRouteArray = myRoutes["routes"]; // should be an array
// 	//console.log("routeList array:" + Object.getOwnPropertyNames(myRoutes) + ":" +myRouteArray);
// 	header = 'No Messages';
// 	if (myRecordArray.length > 0) {
// 		header = "<table id=\"routelisttable\" style=\"visibility:inherit;width:100%;\"><tr><th>RI</th><th>Next Hop</th><th>Alt Hop</th><th>Waveform</th>";
// 		//console.log("header:" + header);
// 		row = 0; // the data row, not the table row
// 		for (r in myRouteArray) {
// 			tmp = myRouteArray[r]; // the current item in the array of messages
// 			deColor = "lightblue";
// 			header += "<tr style=\"background-color:" + deColor + "\" onclick=\"loadRoute(" + row + ", \'" + tmp.ri + "\')\">";
// 			header += "<td class=\"tmlist\" id=\"ri\">" + tmp.ri + "</td>";
// 			header += "<td class=\"tmlist\" id=\"nexthop\">" + tmp.nexthop + "</td>";
// 			header += "<td class=\"tmlist\" id=\"althop\">" + tmp.althop + "</td>";
// 			header += "<td class=\"tmlist\" id=\"waveform\">" + tmp.waveform + "</td></tr>";
// 			row++;
// 		}
// 		header += "</table>";
// 	}
// 	rowset.innerHTML = header; // a full HTML table built above
// }

// function loadRoute(rowid, msgid) {
// 	selectedRow = rowid; // index in DATA LIST and NOT the HTML table which includes headers as row 0
// 	selectedRoute = msgid;
// 	thisri = myRouteArray[rowid].ri;
// 	thisnext = myRouteArray[rowid].nexthop;
// 	thisalt = myRouteArray[rowid].althop;
// 	thiswave = myRouteArray[rowid].waveform;
// 	console.log("thisRI:" + rowid + ":" + thisri);
	
// 	rowlist = document.getElementById("routelisttable").rows;
// 	//console.log("ROWLIST: " + rowlist[1]);
// 	rowcount = rowlist.length;
// 	for (var i = 1; i < rowcount; i++) {
// 		rowlist[i].style.backgroundColor = "lightblue"	;
// 	}
// 	var selColor = "indianred";
// 	 	rowlist[selectedRow + 1].style.backgroundColor = selColor;
// 	// }
// 	console.log("row:" + rowlist[selectedRow + 1].innerHTML);
// 	// + 1 skips the header row	
// 	// now load the 4 values into the text fields
// 	document.getElementById("thisri").value = thisri;
// 	document.getElementById("thisnext").value = thisnext;
// 	document.getElementById("thisalt").value = thisalt;
// 	document.getElementById("thiswave").value = thiswave;
// }

// function deleteRoute() {
// 	client.send("routing/cmd/" + me + "/DELETE", document.getElementById("thisri").value, 2, false);
// }

// function addRoute() {
// 	parts = document.getElementById("thisri").value + "@" + document.getElementById("thisnext").value +  "@" + document.getElementById("thisalt").value + "@" + document.getElementById("thiswave").value;
// 	client.send("routing/cmd/" + me + "/ADD", parts, 2, false);
// }

// function clearRouteForm() {
// 	document.getElementById("thisri").value = "";
// 	document.getElementById("thisnext").value = "";
// 	document.getElementById("thisalt").value = "";
// 	document.getElementById("thiswave").value = "HDLPlus";
// }

// Message Functions
// function loadMessageText(rowid, msgid) {
// 	selectedRow = rowid; // index in DATA LIST and NOT the HTML table which includes headers as row 0
// 	selectedMsgId = msgid;
// 	//console.log("rowid:" + rowid + ":" + msgid);
// 	display = myRecordArray[rowid].content;
	
// 	document.getElementById("msgpreview").innerHTML = display;
// 	rowlist = document.getElementById("msglisttable").rows;
// 	//console.log("ROWLIST: " + rowlist[1]);
// 	rowcount = rowlist.length;
// 	var delivered;
// 	for (var i = 1; i < rowcount; i++) {
// 		delivered = myRecordArray[i - 1].delivered + '';
// 		//console.log("Delivered: " + delivered);
// 		var delColor = "lightpink";
// 		if(delivered === "1") {
// 			delColor = "lightgreen";
// 		}
// 		rowlist[i].style.backgroundColor = delColor;
// 	}
// 	var selColor = "indianred";
// 	delivered = myRecordArray[rowid].delivered + '';
// 	if(delivered === "1") {
// 		selColor = "#619809";
// 	}
// 	rowlist[selectedRow + 1].style.backgroundColor = selColor;
// 	//console.log("row:" + rowlist[rowid + 1].innerHTML);
// 	// + 1 skips the header row
	
// }

// function getMessageList(filter) {
// 	client.send('msg/cmd/' + me + '/MSGLIST', filter, 2, false);
// 	rowlist = document.getElementById('folderlist').children;
// 	//console.log("rowlist:" + rowlist + ":" + rowlist.length);
// 	rowcount = rowlist.length;
// 	for (var r = 0; r < rowcount; r++) {
// 		rowlist[r].style.backgroundColor = '#e0e0e0';
// 		//console.log("row:" + rowlist[r].innerHTML);
// 		if (rowlist[r].innerHTML === filter)
// 			rowlist[r].style.backgroundColor = 'lightblue';
// 	}
// 	document.getElementById("msgpreview").innerHTML = '';
// 	// preload the "move to" select also
// }

// function clearFolderHighlights() {
// 	document.getElementById("InBox").style.backgroundColor = '#e0e0e0';
// 	document.getElementById("OutBox").style.backgroundColor = '#e0e0e0';
// 	document.getElementById("Saved").style.backgroundColor = '#e0e0e0';
// 	document.getElementById("Trash").style.backgroundColor = '#e0e0e0';
// }

// function loadMessageList() {
// 	//console.log("loadMessageList:" + messageList);
// 	rowset = document.getElementById("msglist"); // get the current div
// 	//console.log("rowset:" + rowset);
// 	myRecords = JSON.parse(messageList); // an object containing an array
// 	myRecordArray = myRecords["queue"]; // should be an array
// 	//console.log("mesesageList array:" + Object.getOwnPropertyNames(myRecords) + ":" +myRecordArray);
// 	header = 'No Messages';
// 	if (myRecordArray.length > 0) {
// 		header = "<table id=\"msglisttable\" style=\"visibility:inherit;width:100%;\"><tr><th>Arrived</th><th>Message ID</th><th>RelayTo</th>";//<th>Delivered</th></tr><th>MsgID</th>";
// 		//console.log("header:" + header);
// 		row = 0; // the data row, not the table row
// 		for (m in myRecordArray) {
// 			tmp = myRecordArray[m]; // the current item in the array of messages
// 			var delivered = tmp.delivered == 1;
// 			var delColor = "lightpink";
// 			if(delivered) {
// 				delColor = "lightgreen";
// 			}
			
// 			header += "<tr style=\"background-color:" + delColor + "\" onclick=\"loadMessageText(" + row + ",\'" + tmp.msgid + "\')\">";
// 			header += "<td class=\"hide\" id=\"rowid\">" + tmp.rowid + "</td>";
// 			header += "<td class=\"tmlist\" id=\"arrived\">" + tmp.arrived + "</td>";
// 			header += "<td class=\"tmlist\" id=\"msgid\">" + tmp.msgid + "</td>";
// 			header += "<td class=\"tmlist\" id=\"relay_to\">" + tmp.relay_to + "</td>";
// 			header += "<td class=\"hide\" id=\"delivered\"> " + tmp.delivered + "</td></tr>";
// 			//header += "<td class=\"hide\" id=\"content\">" + tmp.content + "</td>";
			
// 			// if(tmp.msgread == 'true'){
// 			// 	header += "<td class=\"tmlist fill\" id=\"subject\" onmouseenter=\"selectMessageID(\'" + tmp.msgid + "\')\">";
// 			// }
// 			// else{
// 			//	header += "<td style=\"font-weight:bold;\" class=\"tmlist fill\" id=\"subject\" onmouseenter=\"selectMessageID(\'" + tmp.msgid + "\')\">";
// 			// }
// 			//header += "<a href=\"javascript:void(0);\"onclick=\"scrollTo(0, 305);\" >" + tmp.subject + "</a></td>"
// 			row++;
// 		}
// 		header += "</table>";
// 	}
// 	//console.log("newrow:" + header);
// 	//clearFolderHighlights();
// 	//document.getElementById(selFolder).style.backgroundColor = 'lightblue';
// 	rowset.innerHTML = header;
// 	loadOtherList();
// }

// function reloadMessages() {
// 	//console.log("reload: queue/cmd/" + me + '/MSGLIST');
// 	//me = document.getElementById("uniquename").value.trim();
// 	client.send('queue/cmd/' + me + '/MSGLIST', '', 2, false);
// 	client.send('queue/cmd/' + me + '/INQUEUE', '', 2, false);
// }

// function sendToOutBox() {
// 	// get the values from the document	
// 	timestamp = getDateTimeStamp(); // the Date: header format
// 	msgid = getMessageID();
// 	source = document.getElementById("Source").value;
// 	dest = document.getElementById("Dest").value;
// 	if (dest === '') {
// 		alert("Missing destination address.");
// 		return;
// 	}
// 	if (source === '') {
// 		alert("Missing source address.");
// 		return;
// 	}
// 	subject = document.getElementById("Subject").value.replace('/', '-'); // can't use slash in MQTT topic values
// 	if (subject === '') {
// 		subject = "[Empty Subject]";
// 	}
// 	body = document.getElementById("Body").value;
// 	if (body === '') {
// 		body = "[Empty body text]";
// 	}
// 	console.log(`message:${msgid}<br>${timestamp}<br>${source}<br>${dest}<br>${subject}<br>OutBox<br>${body}`);
// 	client.send('msg/cmd/' + me + '/CREATE/' + msgid + '/' + timestamp + '/' + source + '/' + dest + '/' + subject + '/OutBox', body, 2, false);
// }

// function clearMessageForm() {
// 	document.getElementById("TimeStamp").value = '';
// 	document.getElementById("MessageID").value = '';;
// 	document.getElementById("Dest").value = '';;
// 	document.getElementById("Subject").value = '';;
// 	document.getElementById("Body").value = '';
// }

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

// function getMessageID() {
// 	utc = Date.parse(new Date().toGMTString());
// 	mid = utc.valueOf() + '@' + document.getElementById("uniquename").value;
// 	mid = `<${mid}>`;
// 	document.getElementById("MessageID").innerHTML = mid;
// 	return mid;
// }

// function emptyTheTrash() {
// 	client.send("msg/cmd/" + me + "/EMPTY_TRASH", '', 2, false);
// 	alert("All messages in the Trash have been deleted.");
// 	closeNav();
// 	document.getElementById("InBox").click();
// }

// function selectMessageID(msgid) {
// 	selectedMsgId = msgid;
// }

// function moveItemToFolder(row, folder) {
// 	// do MQTT message to update the database and 
// 	// to resend a refreshed message list
// 	therow = myRecordArray[selectedRow].rowid;
// 	console.log("moveItemToFolder:" + therow + ":" + folder);
// 	if(folder === 'Delete') {
// 		var sure = 
// 		client.send('queue/cmd/' + me + '/DELETE/' + therow, '', 2, false);
// 	}
// 	else {
// 		client.send('queue/cmd/' + me + '/MOVE/' + therow + '/' + folder, '', 2, false);
// 	}
// 	// server will send a new message list after the change
// 	//getMessageList(folder); // reload the current folder
// }

// function rerouteTo(row, folder) {
// 	// do MQTT message to update the database and 
// 	// to resend a refreshed message list
// 	therow = myRecordArray[selectedRow].rowid;
// 	console.log("rerouteTo:" + therow + ":" + folder);
// 	client.send('queue/cmd/' + me + '/REROUTE/' + therow + '/' + folder, '', 2, false);
// 	// server will send a new message list after the change
// 	//getMessageList(selFolder); // reload the current folder
// }

// function newMessage() {
// 	document.getElementById("compose").style.display = 'block';
// 	//location.assign("#compose");
// 	loc = document.getElementById("compose").offsetTop;
// 	scrollTo(0, loc);
// 	clearMessageForm();
// }

// function reply(msgid) {
// 	console.log("reply:" + msgid);
// 	if (msgid == 0) {
// 		return;
// 	}
// 	// set the source to dest value of this message and load the
// 	// values into the compose form.
// 	myRecords = JSON.parse(messageList); // an object containing an array
// 	myRecordArray = myRecords["records"]; // should be an array of message objects
// 	replyMsg = '';
// 	found = false;
// 	for (m in myRecordArray) {
// 		replyMsg = myRecordArray[m];
// 		console.log("msgid:" + replyMsg.msgid + ":" + msgid);
// 		if (msgid === replyMsg.msgid) {
// 			found = true;
// 			break;
// 		}
// 	}
// 	if (found) {
// 		console.log("replyMsg:" + replyMsg);

// 	}
// 	else {
// 		alert("Message: " + msgid + " not found");
// 	}
// 	document.getElementById("compose").style.display = 'block';
// 	location.assign("#compose");
// 	// now set the addressing and body text
// 	document.getElementById("Dest").value = replyMsg.source;
// 	document.getElementById("Subject").value = "Re: " + replyMsg.subject
// 	if (document.getElementById("includeText").checked) {
// 		document.getElementById("Body").value = "\r\n[" + replyMsg.source + ", said]\r\n---------------------------------------------\r\n" + replyMsg.body + "\r\n---------------------------------------------\r\n\r\n";
// 	}
// 	document.getElementById("Body").selectionEnd = 0;// move cursor to beginning
// 	document.getElementById("Body").focus();// move cursor to beginning

// }

// function sendSelectedMessage(rowid) {
// 	console.log("sendSelectedMessage:" + msgid);
// 	if (document.getElementById("msgpreview").innerHTML.trim() === '') {
// 		alert("Select a message first...");
// 		return;
// 	}
// 	// tell the MQTT broker to send the message
// 	currAddr = document.getElementById("other1").value;
// 	currAddr = currAddr.split(":")[1];
// 	console.log("currAddr: " + currAddr);
	
// 	if (currAddr.value === '') {
// 		alert("You must choose the address to send to.");
// 		location.assign("#time");
// 		document.getElementById("other1").focus();
// 		return;
// 	}
// 	therow = myRecordArray[selectedRow].rowid;
// 	console.log("queue/cmd/" + me + "/SEND/" + currAddr + "/" + therow);
// 	client.send("queue/cmd/" + me + "/SEND/" +  currAddr + "/" + therow, '', 2, false);
// 	//alert("This would send the message to the address: " + currAddr.value);
// }

function sendChat(other, chatText) {
	console.log("chat/send/" + me + "/" + other + " : " + chatText);
	client.send("chat/send/" + me + "/" + other, chatText, 2, false);
}

function loadSettings() {
	me = localStorage.getItem("uniquename");
	// if(source != '')
	// 	uniqueNames.push(source);
	document.querySelector("title").innerHTML = 'Chat Dragon - ' + me;
	// re-use the source variable
	//document.getElementById("uniquename").value = source;
	if(passphrase === '') {
		openNav();
	}
}

// function disableAMDText(calltype) {
// 	if(calltype == "IND TEXT" || calltype == "ALLCALL") {
// 		document.getElementById("amdtext").disabled = false;
// 	}
// 	else {
// 		document.getElementById("amdtext").disabled = true;
// 	}
	
// }
// End Message Functions 

// Start Connectivity Functions

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

// function goToTop() {
// 	scrollTo(0, -50);
// 	// document.body.scrollTop = 0;
// 	// document.documentElement.scrollTop = 0;
// }

function refreshRFU(rfuname) {
	//console.log("Refresh RFU: " + rfuname);
	client.send("rfu/cmd/" + rfuname + "/reload", '', 2, false);
	//client.send("queue/cmd/" + rfuname + "/INQUEUE", '', 2, false);
	client.send("rfu/cmd/" + rfuname + "/3GTIME", '', 2, false);
	//client.send("routing/cmd/" + rfuname + "/ROUTELIST", '', 2, false);
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
	// get the list of routable messages
	// client.send("queue/cmd/" + rfuname + "/MSGLIST", "", 2, false);
	// client.send("routing/cmd/" + rfuname + "/ROUTELIST", "", 2, false);
	// // get the version number of the software
	// client.send("presence/ver/" + rfuname, '', 2, false);
	// document.getElementById("routelist").innerHTML = "";
	// client.send("rfu/cmd/" + rfuname + "/3GTIME", '', 2, false);
	// setTimeout(reloadCICS(), 2000);
	client.send("alerts/get/" + rfuname, '', 2, false);
	clearchat();
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

	// var scancell = row.insertCell(1);
	// scancell.id = rfuname + "Scan";
	// scancell.className = "prescell";
	
	// var linkcell = row.insertCell(1);
	// linkcell.id = rfuname + "Linked";
	// linkcell.className = "prescell";

	// var queuedcell = row.insertCell(2);
	// queuedcell.innerHTML = "?";
	// queuedcell.id = rfuname + "Queued";
	// queuedcell.className = "center prescell";
	// client.send("queue/cmd/" + rfuname + "/MSGLIST", '', 2, false);
	//client.send("queue/cmd/" + rfuname + "/INQUEUE", '', 2, false);
	client.send("rfu/cmd/" + rfuname + "/reload", '', 2, false);
	//client.send("rfu/cmd/" + rfuname + "/3GTIME", '', 2, false);
	//console.log("send update requests");
}

// End Connectivity Functions
