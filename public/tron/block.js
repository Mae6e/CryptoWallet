const TronWeb = require('tronweb');
const TronGrid = require('trongrid');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
var tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tronWeb.trx.getCurrentBlock().then(function(res) {
  if(res.block_header != undefined) {
    console.log(JSON.stringify(res.block_header));
  } else {
    console.log("");
  }
  process.exit(-1);
}).catch(console.error);