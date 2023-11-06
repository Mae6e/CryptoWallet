let pvtKey = process.argv[2];
let toAddr = process.argv[3];
let contract = process.argv[4];
let amount = parseInt(process.argv[5]);

const TronWeb = require('tronweb');
const TronGrid = require('trongrid');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
var tronWeb = new TronWeb(fullNode, solidityNode, eventServer, pvtKey);

sendToken();

async function sendToken() {
  // tronWeb.setAddress(contract);
  const contractIns = await tronWeb.contract().at(contract);
  await contractIns.transfer(toAddr, amount).send({ feeLimit: 31000000 }).then(result => {
    console.log(JSON.stringify(result));
    process.exit(-1);
  }).catch(err => {
    console.log(err);
    process.exit(-1);
  });
}
