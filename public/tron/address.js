const TronWeb = require('tronweb');
const { TronGridUrl } = require('../../utils');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
var tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tronWeb.createAccount().then(function (res) {
  console.log(JSON.stringify(res));
  //process.exit(-1);
}).catch(console.error);