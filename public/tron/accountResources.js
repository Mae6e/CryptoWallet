
const { TronGridUrl } = require('../../utils');
const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

const address = process.argv[2];
getAccountResources(address);

async function getAccountResources(address) {
    try {
        const account = await tronWeb.trx.getAccountResources(address);
        console.log(JSON.stringify(account));
        process.exit(-1);
    }
    catch (error) {
        console.error(error);
        process.exit(-1);
    }
}