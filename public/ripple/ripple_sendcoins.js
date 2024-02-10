
const xrpl = require('xrpl');
const { WebSocketRipple } = require('../../utils');


//? define the network client
const client = new xrpl.Client(WebSocketRipple);


const secret = process.argv[2];
const toAddress = process.argv[3];
const value = process.argv[4];
const tag = process.argv[5];

if (!tag) {
	console.error('please enter tag!');
	process.exit(-1);
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
		console.error(error);
	} finally {
		//? disconnect when done
		await client.disconnect();
		process.exit(-1);
	}
}

transfer();
