const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const { NetworkName } = require('../../utils');

//? Use the web3Network variable in your script
const network = process.argv[2];
const address = process.argv[3];
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

// const coinBalance = web3.eth.getBalance(address);
// console.log(web3.utils.fromWei(coinBalance, 'ether'));


const coinBalance = web3.eth.getBalance(address);
const balanceInWei = new BigNumber(coinBalance.toString());
const balanceInEther = web3.utils.fromWei(balanceInWei.toString(), 'ether');
console.log(balanceInEther);