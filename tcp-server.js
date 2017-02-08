var net = require('net');

var HOST = '127.0.0.1';
var PORT = 6969;

var RX = false;
var TX = false;

var TX_freq, RX_freq;

// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
net.createServer(function(sock) {
    
    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    
    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        
        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        data = data.toString('utf8');

        // V Sub for RX and V Main for TX (according to hamlib notation)
        // The follwoing sets of conditional statements are done following the hamlib protocol for rigctld
        // The set of rules are prepared for a full duplex "gpredict" configuration
        if (/Sub/.test(data)) {
            RX = true;
            TX = false;
        }
        else if (/Main/.test(data)) {
            RX = false;
            TX = true;
        }

        if ( /^[a-z]/.test(data) ) {
            if (/t/.test(data) && RX) {
                sock.write('0');
            }
            else if (/t/.test(data) && TX) {
                sock.write('1');
            }
            else if (/f/.test(data) && RX) {
                sock.write(RX_freq);
            }
            else if (/f/.test(data) && TX) {
                sock.write(TX_freq);
            }            
        }
        else if ( /^[A-Z]/.test(data) ) {
            if(/^F/.test(data)) {
                if(RX){
                    RX_freq = data.match(/\d+/)[0]
                    // TO make request to GS SW to retune RX channel
                }
                else if(TX) {
                    TX_freq = data.match(/\d+/)[0]
                    // TO make request to GS SW to retune TX channel
                }
            }
            sock.write('RPRT 0');
        }
        
    });
    
    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });
    
}).listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);