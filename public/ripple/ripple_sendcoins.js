
const xrpl = require('xrpl');

//? define the network client
const client = new xrpl.Client('wss://s1.ripple.com:443');

var secret = process.argv[2];
var toAddress = process.argv[3];
var value = process.argv[4];
var tag = process.argv[5];

if (!tag) {
	console.error('please enter tag!');
}

async function transfer() {
	try {

		const wallet = xrpl.Wallet.fromSeed(secret);
		await client.connect();

		const prepared = await client.autofill({
			"TransactionType": "Payment",
			"Account": wallet.address,
			"Amount": xrpl.xrpToDrops(value),
			"Destination": toAddress,
			"DestinationTag": parseInt(tag)
		});

		//? signed transaction
		const signed = wallet.sign(prepared);
		if (!signed || !signed.tx_blob) {
			console.error('can not sign!');
		}

		//? submit transaction
		const submitedTx = await client.submitAndWait(signed.tx_blob);
		console.log(JSON.stringify(submitedTx));
	} catch (error) {
		console.error(error.message);
	} finally {
		//? disconnect when done
		await client.disconnect();
	}
}

transfer();
