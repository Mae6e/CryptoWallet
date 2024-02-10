const TronWeb = require('tronweb');
const { TronGridUrl } = require('../../utils');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tronWeb.trx.getCurrentBlock().then(function (res) {
  if (res.block_header != undefined) {
    console.log(JSON.stringify(res.block_header));
  } else {
    console.log("");
  }
  process.exit(-1);
}).catch(console.error);