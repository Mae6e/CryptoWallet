
const { Web3 } = require('web3');
const { NetworkName } = require('./index');

class Web3helper {

    initialWeb3Network(network) {
        //? MainNet
        if (network === NetworkName.BSC) {
            return new Web3(process.env.RPC_ENDPOINT_BSC);
        }
        else if (network === NetworkName.ERC20) {
            return new Web3(process.env.RPC_ENDPOINT_ERC20);
        }
        else if (network === NetworkName.ARBITRUM) {
            return new Web3(process.env.RPC_ENDPOINT_ARBITRUM);
        }
        else if (network === NetworkName.POLYGON) {
            return new Web3(process.env.RPC_ENDPOINT_POLYGON);
        }
    }
}

module.exports = Web3helper;




