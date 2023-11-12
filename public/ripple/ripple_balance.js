const RippleAPI = require('ripple-lib').RippleAPI;
var address = process.argv[2];

const Ripple = new RippleAPI({
	server: 'wss://s2.ripple.com', // Public rippled server
});

Ripple.on('error', function (errorCode, errorMessage) {
	console.log('{"status":0,"msg":"Unable to withdraw, problem occured. ' + errorMessage + '."}');
});

Ripple.on('connected', function () {
	// console.log('connected');process.exit(-1);
});

Ripple.on('disconnected', function (code) {
	console.log('disconnected, code:', code);
});

// Ripple.connect().then(function () {
// 	return Ripple.getServerInfo();
// }).then(function (server_info) {

// 	Ripple.getBalances(adminaddress).then(function (transaction) {
// 		console.log(JSON.stringify(transaction, null, 2));
// 		//process.exit(-1);
// 	}).catch(console.error);
// }).catch(console.error);


async function getBalances() {
	try {
		await Ripple.connect();

		//? Get the balances for the specified address
		const balances = await api.getBalances(address);
		console.log(balances);
		const balancesJSON = JSON.stringify(balances, null, 2);
		await Ripple.disconnect();
		console.log(balancesJSON);
	} catch (error) {
		console.error(error);
	}
}

getBalances();