var net = require('net');

var HOST = '127.0.0.1';
var PORT_gp = 3533;
var PORT_hamlib = 4533;
var AZ, EL;
var readAZ;
var readAZEL = "0\n1";

// File with calibration values taken experimentally
var calibration = require('./calibrationParameters.json');


/*** Client to communicate with hamlib ***/
var client = new net.Socket();
client.connect(PORT_hamlib, HOST, function() {

    console.log('CLIENT CONNECTED TO: ' + HOST + ':' + PORT_hamlib);

});


/* Close socket when quitting */
process.on('SIGINT', function() {
	// Close the client socket completely
	client.destroy();
	process.exit();
});

/*** Server to communicate with Gpredict ***/

// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
net.createServer(function(sock) {

    client.on('data', function(data) {

    console.log('DATA from controller: ' + data);
    data = data.toString('utf8');
    
    // If blocks in order to handle different obtained answers fromw hamlib
    if (data.match(/^([\w\-]+)/)[0] == "get_pos" || !/^[a-zA-Z]/.test(data)) {
    	readAZ = data.match(/[0-9]*\.?[0-9]+/g)[0];
    	readAZ = parseInt(readAZ);
    	// Translation from real value to desired value using JSON file in order to cheat GPredict
    	readAZ = calibration.desired[calibration.real.indexOf(AZ)];
    	readAZEL = readAZ +"\n" + data.match(/[0-9]*\.?[0-9]+/g)[1];
    	console.log("readAZEL", readAZEL);
    }
    else  {
    	console.error("Unhandled Command from Controller")
    }	

	});
    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTION TO SERVER: ' + sock.remoteAddress +':'+ sock.remotePort);
    
    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        
        console.log('DATA from Gpredict' + ': ' + data);
        data = data.toString('utf8');

        /*** Lowercase commands or getters ***/
        if ( /^[a-z]/.test(data) ) {
            if (/p/.test(data)) {
            	console.log("Send to controller: p")
            	client.write("p")
            	sock.write(readAZEL);
            }
        }
        /*** Uppercase commands or setters ***/
        else if ( /^[A-Z]/.test(data) ) {
            if(/^P/.test(data)) {
                AZ = data.match(/[0-9]*\.?[0-9]+/g)[0];
	            AZ = parseInt(AZ);
	            // Translation from desired to real value in order to cheat the rotator
	            AZ  = calibration.real[calibration.desired.indexOf(AZ)];
                
                EL = data.match(/[0-9]*\.?[0-9]+/g)[1];

	            var command = "P " + AZ +" " + EL;

	            console.log('Send to controller: '+command)
	            client.write(command)
	            // Return of Successfully Sent Command
	            sock.write('RPRT 0');	            
            }
            else {console.error("Unhandled Command")}
        }
        
    });
    
    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });    
}).listen(PORT_gp, HOST);
console.log('Server listening on ' + HOST +':'+ PORT_gp);