
const { Web3 } = require('web3');
const { NetworkType } = require('./constants');

class Web3helper {

    initialWeb3Network(network) {
        //? MainNet
        if (network == NetworkType.BSC) {
            return new Web3(process.env.RPC_ENDPOINT_BSC);
        }
        else if (network == NetworkType.ERC20) {
            return new Web3(process.env.RPC_ENDPOINT_ERC20);
        }
        else if (network == NetworkType.ARBITRUM) {
            return new Web3(process.env.RPC_ENDPOINT_ARBITRUM);
        }
        else if (network == NetworkType.POLYGON) {
            return new Web3(process.env.RPC_ENDPOINT_POLYGON);
        }
    }

    async getTokenDecimals(network, contract) {
        try {

            const web3 = initialWeb3Network(network);
            const tokenAbi = [{ "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }]

            const tokenContract = new web3.eth.Contract(tokenAbi, contract);
            const decimals = await tokenContract.methods.decimals().call();

            return decimals;
        }
        catch (error) {
            return 0;
        }
    }
}

module.exports = Web3helper;




