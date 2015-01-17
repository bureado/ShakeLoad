var socket = require('socket.io-client')('http://QSub.trafficmanager.net');
var azure = require('azure-storage');

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

socket.on("connect", function() {
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

socket.on("disconnect", function() {
	++dscn;
	console.log(ppid + " socket disconnected");

});

socket.on("reconnect", function() {
	++rcns;
	console.log(ppid + " socket reconnected");

});

function wrapup() {
	console.log("Packets      " + pkct);
	console.log("Rate         " + rate);
	console.log("Duration     " + (packetEnd-packetStart)/1e3);

}
