const RippleAPI = require('ripple-lib').RippleAPI; // require('ripple-lib')


var secret = process.argv[2];
var address = process.argv[3];
var toaddress = process.argv[4];
var value = process.argv[5];
var tag = process.argv[6];

if (tag === undefined) {
	tag = '';
}

const api = new RippleAPI({ server: 'wss://s1.ripple.com:443' });

var instructions = { maxLedgerVersionOffset: 5 };
if (tag != '') {
	var payment = {
		source: {
			address: address,
			maxAmount: {
				value: value,
				currency: 'XRP'
			}
		},
		destination: {
			address: toaddress,
			amount: {
				value: value,
				currency: 'XRP'
			},
			tag: parseInt(tag)
		}
	};
} else {
	var payment = {
		source: {
			address: address,
			maxAmount: {
				value: value,
				currency: 'XRP'
			}
		},
		destination: {
			address: toaddress,
			amount: {
				value: value,
				currency: 'XRP'
			},
		}
	};
}
function quit(message) {
	console.log(+"~" + JSON.stringify(message));
	process.exit(0);
}
function fail(message) {
	console.error(message);
	process.exit(1);
}
api.connect().then(function () {
	//console.log('Connected...');
	return api.preparePayment(address, payment, instructions).then(function (prepared) {
		//console.log('Payment transaction prepared...'+prepared.txJSON);
		var signed = api.sign(prepared.txJSON, secret);
		// console.log('Payment transaction signed...');
		txid = signed.id;
		api.submit(signed.signedTransaction).then(quit, fail);
		console.log(+"~" + JSON.stringify({ txid: txid }));
	});
}).catch(fail);
