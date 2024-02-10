
const { TronGridUrl } = require('../../utils');

let contract = process.argv[2];
let address = process.argv[3];

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tokenBalance();

async function tokenBalance() {
  try {
    tronWeb.setAddress(contract);
    const contractIns = await tronWeb.contract().at(contract);
    let result = await contractIns.balanceOf(address).call();
    console.log(JSON.stringify(result));
    process.exit(-1);
  } catch (error) {
    console.error(error);
    process.exit(-1);
  }
}