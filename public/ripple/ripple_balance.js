const RippleAPI = require('ripple-lib').RippleAPI;
var adminaddress=process.argv[2];

const Ripple = new RippleAPI({
	server: 'wss://s2.ripple.com', // Public rippled server
});

Ripple.on('error', function (errorCode, errorMessage) {
	resp.json('{"status":0,"msg":"Unable to withdraw, problem occured. '+errorMessage+'."}');
});

Ripple.on('connected', function () {
	// console.log('connected');process.exit(-1);
});

Ripple.on('disconnected', function (code) {
	console.log('disconnected, code:', code);
});

Ripple.connect().then(function () {
	return Ripple.getServerInfo();
}).then(function (server_info) {

Ripple.getBalances(adminaddress).then(function (transaction) {
		console.log(JSON.stringify(transaction));process.exit(-1);
	}).catch(console.error);
}).catch(console.error);