const Web3 = require('web3');
const { NetworkName } = require('../../utils');

//? Use the web3Network variable in your script
const network = process.argv[2];
let web3;

//? MainNet
if (network === NetworkName.BSC) {
    web3 = new Web3(process.env.RPC_ENDPOINT_BSC);
}
else if (network === NetworkName.ERC20) {
    web3 = new Web3(process.env.RPC_ENDPOINT_ERC20);
}
else if (network === NetworkName.ARBITRUM) {
    web3 = new Web3(process.env.RPC_ENDPOINT_ARBITRUM);
}
else if (network === NetworkName.POLYGON) {
    web3 = new Web3(process.env.RPC_ENDPOINT_POLYGON);
} else {
    return;
}

const addr = web3.eth.accounts.create([process.env.WEB3_KEY]);
console.log(JSON.stringify(addr));