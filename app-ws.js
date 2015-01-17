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

	if ( packetEnd - packetStart > 10000 ) {
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
			reconnects: entGen.String(rcns),
			disconnects: entGen.String(dscn),
			start: entGen.String(packetStart),
			end: entGen.String(packetEnd)
		};

		tableSvc.insertEntity(azureTableName, entity, {echoContent: true}, function (error, result, response) {
			if(result) {
				wrapup();
			}
		});
	}

});

socket.on("close", function() {
	++dscn;
	console.log(ppid + " socket disconnected");

});

function wrapup() {
	console.log("Packets      " + pkct);
	console.log("Rate         " + rate);
	console.log("Duration     " + (packetEnd-packetStart)/1e3);

}
