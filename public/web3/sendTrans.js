let fromAddr = process.argv[2];
let key = process.argv[3];
let toAddr = process.argv[4];
let amount = parseInt(process.argv[5]);

const Web3 = require('web3');
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');

async function sendBnb() { 
  const nonce = await web3.eth.getTransactionCount(fromAddr, 'latest'); 
  const transaction = { 
    'to': toAddr,
    'value': amount, 
    'gas': 21000, 
    'gasPrice': 10000000000,
    'nonce': nonce, 
  }; 
  const signedTx = await web3.eth.accounts.signTransaction(transaction, key); 
  web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(error, hash) { 
    if (!error) { 
      console.log(JSON.stringify({status:'success', result:hash}));
    } else { 
      console.log(JSON.stringify({status:'error', result:error}));
    } 
  }); 
} 
sendBnb();