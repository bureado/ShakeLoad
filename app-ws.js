var WebSocket = require('ws');
var azure = require('azure-storage');
var uuid = require('node-uuid');

var socket = new WebSocket('http://WSub.trafficmanager.net:8080');
var ppid = uuid();

// Global counters
var packetCount = 0;
var connectCount = 0;
var disconnectCount = 0;
var reconnectCount = 0;
var gapCounter = 0;

// Global time counters
var timespanStart;
var timespanEnd = 0;
var processStart = new Date()/1e3;

// Azure configuration
var accountName = 'quakeshake';
var accountKey = 'SUBKEY';
var azureTableName = 'shakeload';
var tableSvc, entGen;

// Timestamp tracking
var timeline = {};

socket.on("open", function() {
        ++connectCount;
        tableSvc = azure.createTableService(accountName, accountKey);
        entGen = azure.TableUtilities.entityGenerator;
        console.log(ppid + " socket connected");

});

socket.on("message", function(message) {
        console.log(ppid + " got message, len: " + message.length);

        var packet = JSON.parse(message);
        if (!packet.data){
                return;
        } else {
                packetCount++;
        }

        // Update my timespan
        if (!timespanStart) {
                timespanStart = packet.starttime;
        }
        if ( packet.endtime > timespanEnd ) {
                timespanEnd = packet.endtime;
        }
	if (packet.starttime - timeline[packet.sta] > 5) {
		++gapCounter;
		console.log("STA: " + packet.sta + " GAP: " + (packet.starttime-timeline[packet.sta]));
	}
	timeline[packet.sta] = packet.endtime;

        // Halftime report
        if (!(packetCount%50)) {
                timeDelta = new Date()/1e3 - processStart;
                spanRate  = packetCount/((timespanEnd-timespanStart)/1e3);
                deltaRate = packetCount/timeDelta;

                var entity = {
                        PartitionKey: entGen.String('reports'),
                        RowKey: entGen.String(ppid),
                        processStart: entGen.String(processStart),
                        packetCount: entGen.String(packetCount),
                        timeDelta: entGen.String(timeDelta),
                        spanRate: entGen.String(spanRate),
                        deltaRate: entGen.String(deltaRate),
                        connectCount: entGen.String(connectCount),
                        reconnectCount: entGen.String(reconnectCount),
                        disconnectCount: entGen.String(disconnectCount),
			gapCount: entGen.String(gapCounter),
                        timespanStart: entGen.String(timespanStart),
                        timespanEnd: entGen.String(timespanEnd)
                };

                tableSvc.insertOrReplaceEntity(azureTableName, entity, {echoContent: true}, function (error, result, response) {
                        console.log(entity);
                        if(result) {
                                console.log(ppid + " data stored in Azure");
                        }
                });
        }

});

socket.on("close", function() {
        ++disconnectCount;
        console.log(ppid + " socket disconnected");

});

