var socket = require('socket.io-client')('http://qssub.cloudapp.net:8080');

var pkct = 0;
var packetStart;  // epoch in ms
var packetEnd = 0;    // epoch in ms
var fullData = {}; // 1-indexed
var cnns = 0;
var dscn = 0;
var rcns = 0;

console.time("quake");

socket.on("connect", function() {
	++cnns;
	console.log(process.pid + " socket connected");

}), socket.on("message", function(t) {
	var e = JSON.parse(t);

	if (!e.data){
		return;
	}

	pkct++;

	if (!packetStart) {
		packetStart = e.starttime;
	}

	if ( e.endtime > packetEnd ) {
		packetEnd = e.endtime;
	}
/*
	var msgl = t.toString().length;     // in bytes
	var msgd = e.endtime - e.starttime; // in ms
	var bptd = msgl / msgd;             // in bytes/ms

	fullData[pkct] = { msgl: msgl, msgd: msgd, bptd: bptd };
*/

}), socket.on("disconnect", function() {
	++dscn;
	console.log(process.pid + " socket disconnected");

}), socket.on("reconnect", function() {
	++rcns;
	console.log(process.pid + " socket reconnected");
});

process.on('SIGINT', function() {
	console.log("Caught interrupt signal");
	wrapup();
	process.exit();
});

function wrapup() {
	if (!pkct || !packetEnd || !packetStart) {
		return;
	}

	var rate = pkct/((packetEnd-packetStart)/1e5);

	console.log("Packets      " + pkct);
	console.log("Rate         " + rate);
	console.log("Duration     " + (packetEnd-packetStart)/1e5);
	console.log("Connects     " + cnns);
	console.log("Reconnects   " + rcns);
	console.log("Disconnects  " + dscn);

	console.log("Start packet " + packetStart);
	console.log("Final packet " + packetEnd);

	console.timeEnd("quake");
}
