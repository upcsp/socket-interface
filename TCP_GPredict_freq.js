const net = require('net');
const spawn = require('child_process').spawn;

const child= spawn('./regrpccli', ['::1','49501', 'gpredict'], {
  cwd: process.env.HOME + '/repos/regrpccli/'
})

child.stdin.setEncoding = 'utf-8';

child.stdout.on('data', (data) => {
  console.log(`child stdout: ${data}`);
});

child.stderr.on('data', (data) => {
  console.log(`child stderr: ${data}`);
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});


let sequence = 1;
let command;

const HOST = '127.0.0.1';
const PORT = 6969;

let RX = false;
let TX = false;

let TX_freq, RX_freq;

net.createServer(function(sock) {

	console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);

	sock.on('data', function(data) {

		// console.log('DATA ' + sock.remoteAddress + ': ' + data);
		data = data.toString('utf8');

		// V Sub for RX and V Main for TX (according to hamlib notation)
		// The follwoing sets of conditional statements are done following the hamlib protocol for rigctld
		// The set of rules are prepared for a full duplex "gpredict" configuration
		if (/Sub/.test(data)) {
			// RX mode
			RX = true;
			TX = false;
		}
		else if (/Main/.test(data)) {
			// TX mode
			RX = false;
			TX = true;
		}
		//  GPredict Getters Dummmy Response
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
		// GPredict Setters
		else if ( /^[A-Z]/.test(data) ) {
			if(/^F/.test(data)) {
				if(RX){
					RX_freq = data.match(/\d+/)[0]
					// TO make request to OC GS SW to retune RX channel
					command = 	"blue"+"\n"+
								"Command=Write"+"\n"+
								"Key=RX frequency"+"\n"+
								"Value="+RX_freq+""+"\n"+
								"Sequence="+sequence+"\n"+
								"SEND"+"\n";
					child.stdin.write(command);
				}
				else if(TX) {
					TX_freq = data.match(/\d+/)[0]
					command = 	"blue"+"\n"+
								"Command=Write"+"\n"+
								"Key=TX frequency"+"\n"+
								"Value="+TX_freq+""+"\n"+
								"Sequence="+sequence+"\n"+
								"SEND"+"\n";
					child.stdin.write(command);
				}
			}
			sequence++;
			// Dummy Response to Gpredict
			sock.write('RPRT 0');
		}
	});

	sock.on('close', function(data) {
		console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
	});

}).listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);