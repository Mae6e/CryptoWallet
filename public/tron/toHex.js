
const { TronGridUrl } = require('../../utils');
let address = process.argv[2];

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

let hexAddr = tronWeb.address.toHex(address);
console.log(hexAddr);

