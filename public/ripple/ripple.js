console.log('entereds');
const RippleAPI = require('ripple-lib').RippleAPI;
console.log('connecteds');

var type = process.argv[2];
const Ripple = new RippleAPI({ server: 'wss://s2.ripple.com' });


Ripple.on('error', function (errorCode, errorMessage) {
console.log(errorCode + ': ' + errorMessage);
resp.json('{"status":0,"msg":"Unable to withdraw, problem occured. '+errorMessage+'."}');
});

Ripple.on('connected', function () {
console.log('connected');
});
Ripple.on('disconnected', function (code) {
// code - close code sent by the server
// will be 1000 if this was normal closure
console.log('disconnected, code:', code);
});
Ripple.connect().then(function () {
console.log('ripple connected');
return Ripple.getServerInfo();
// insert code here //
}).then(function (server_info) {
	var rippleAddress = Ripple.generateAddress();
	console.log(rippleAddress);process.exit(-1);
}).catch(console.error);