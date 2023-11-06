let from = parseInt(process.argv[2]);
let to = parseInt(process.argv[3]);

const TronWeb = require('tronweb');
const TronGrid = require('trongrid');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
var tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tronWeb.trx.getBlockRange(from, to).then(function(res) {
  console.log(res);
  process.exit(-1);
}).catch(console.error);