
const { TronGridUrl } = require('../../utils');

let from = parseInt(process.argv[2]);
let to = parseInt(process.argv[3]);

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tronWeb.trx.getBlockRange(from, to).then(function (res) {
  console.log(res);
  process.exit(-1);
}).catch(console.error);