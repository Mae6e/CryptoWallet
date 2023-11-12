const RippleAPI = require('ripple-lib').RippleAPI;
var address = process.argv[2];

const Ripple = new RippleAPI({
	server: 'wss://s2.ripple.com', // Public rippled server
});

Ripple.on('error', function (errorCode, errorMessage) {
	console.error(errorMessage);
});

const getBalances = async () => {
	try {
		await Ripple.connect();

		//? Get the balances for the specified address
		const balances = await Ripple.getBalances(address);
		const balancesJSON = JSON.stringify(balances);
		await Ripple.disconnect();
		console.log(balancesJSON);
	} catch (error) {
		console.error(error);
	}
}

getBalances();