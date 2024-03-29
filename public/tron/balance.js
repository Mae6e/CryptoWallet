let address = process.argv[2];
const { TronGridUrl } = require('../../utils');
const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tronWeb.trx.getBalance(address).then(result => {
  console.log(JSON.stringify(result));
  process.exit(-1);
}).catch(error => {
  console.error(error);
  process.exit(-1);
});