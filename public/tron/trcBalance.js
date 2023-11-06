let contract = process.argv[2];
let address = process.argv[3];

const TronWeb = require('tronweb');
const TronGrid = require('trongrid');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
var tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

tokenBalance();

async function tokenBalance() {
  try {
    tronWeb.setAddress(contract);
    const contractIns = await tronWeb.contract().at(contract);
    let result = await contractIns.balanceOf(address).call();
    console.log(JSON.stringify(result));
    process.exit(-1);
  } catch(error) {
    console.log(JSON.stringify([]));
    process.exit(-1);
  }
}