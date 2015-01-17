var WebSocket = require('ws');
var azure = require('azure-storage');

var socket = new WebSocket('http://WSub.trafficmanager.net:8080');

var pkct = 0;
var packetStart;  // epoch in ms
var packetEnd = 0;    // epoch in ms
var fullData = {}; // 1-indexed
var cnns = 0;
var dscn = 0;
var rcns = 0;

var ppid = process.pid;

var rate;

var accountName = 'quakeshake';
var accountKey = 'SUBWITHKEY';
var azureTableName = 'shakeload';

socket.on("open", function() {
	++cnns;
	console.log(ppid + " socket connected");

});

socket.on("message", function(t) {
	console.log("RCV: " + t.length);
	var e = JSON.parse(t);

	if (!e.data){
		return;
	}

	pkct++;

	if(!(pkct%500)) {
		console.log('.');
	}

	if (!packetStart) {
		packetStart = e.starttime;
	}

	if ( e.endtime > packetEnd ) {
		packetEnd = e.endtime;
	}

});

socket.on("close", function() {
	++dscn;
	console.log(ppid + " socket disconnected");

});


process.on('SIGINT', function() {
	console.log("Caught interrupt signal");

	if(!pkct) {
		console.log("Never connected");
		process.exit();
	}

	rate = pkct/((packetEnd-packetStart)/1e3);

	var tableSvc = azure.createTableService(accountName, accountKey);
	var entGen = azure.TableUtilities.entityGenerator;
	var entity = {
		PartitionKey: entGen.String('reports'),
		RowKey: entGen.String(ppid.toString()),
		packets: entGen.String(pkct),
		rate: entGen.String(rate),
		delta: entGen.String((packetEnd-packetStart)/1e3),
		connects: entGen.String(cnns),
		disconnects: entGen.String(dscn),
		start: entGen.String(packetStart),
		end: entGen.String(packetEnd)
	};

	tableSvc.insertEntity(azureTableName, entity, {echoContent: true}, function (error, result, response) {
		if(result) {
			console.log(result);
			wrapup();
			process.exit();
		}
	});
});

function wrapup() {
	if (!pkct || !packetEnd || !packetStart) {
		return;
	}

	console.log("Packets      " + pkct);
	console.log("Rate         " + rate);
	console.log("Duration     " + (packetEnd-packetStart)/1e3);
	console.log("Connects     " + cnns);
	console.log("Disconnects  " + dscn);

	console.log("Start packet " + packetStart);
	console.log("Final packet " + packetEnd);
}
