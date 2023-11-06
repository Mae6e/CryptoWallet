let pvtKey = process.argv[2];
let toAddr = process.argv[3];
let amount = parseInt(process.argv[4]);

const TronWeb = require('tronweb');
const TronGrid = require('trongrid');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
var tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tronWeb.trx.sendTransaction(toAddr, amount, pvtKey).then(result => { 
  console.log(JSON.stringify(result));
  process.exit(-1);
}).catch(err =>{
  console.log(JSON.stringify(err));
  process.exit(-1);
});