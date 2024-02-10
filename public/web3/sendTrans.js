
const { web3GasLimit } = require('../../utils/index');
const Web3Helper = require('../../utils/web3Helper');
const web3Helper = new Web3Helper();

const fromAddr = process.argv[2];
const key = process.argv[3];
const toAddr = process.argv[4];
const amount = parseInt(process.argv[5]);
const network = process.argv[6];

async function sendBnb() {
  try {
    const web3 = web3Helper.initialWeb3Network(network);
    if (!web3) {
      console.error('The web3 object is null');
      process.exit(-1);
    }
    const nonce = await web3.eth.getTransactionCount(fromAddr, 'latest');
    const gasPrice = await web3.eth.getGasPrice();
    const fee = gasPrice.toString() * web3GasLimit;

    // let value = (amount / Math.pow(10, 18)).toFixed(7) * Math.pow(10, 18);
    const value = (amount - fee);

    // const val = web3.utils.toNumber(value);


    const transaction = {
      'to': toAddr,
      'value': value,
      'gas': web3GasLimit,
      'gasPrice': gasPrice,
      'nonce': nonce,
    };
    const signedTx = await web3.eth.accounts.signTransaction(transaction, key);

    const response = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(JSON.stringify({ result: response.transactionHash, amount: value }));
    process.exit(-1);
  }
  catch (error) {
    console.error(error);
    process.exit(-1);
  }
}
sendBnb();