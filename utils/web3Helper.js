
const { Web3 } = require('web3');
const { NetworkType } = require('./constants');


const logger = require('../logger')(module);


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

            const web3 = this.initialWeb3Network(network);
            const tokenAbi = [{ "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }]

            const tokenContract = new web3.eth.Contract(tokenAbi, contract);
            const decimals = await tokenContract.methods.decimals().call();

            return decimals;
        }
        catch (error) {
            return 0;
        }
    }

    toHex(blockNumber) {
        return web3.utils.toHex(blockNumber);
    }

    async getLatestBlockNumber(network) {
        const web3 = this.initialWeb3Network(network);
        const result = await web3.eth.getBlockNumber();
        if (!result) return 0;
        return result.toString();
    }

    async getTransactionsByBlockNumber(network, blockNumber) {
        const web3 = this.initialWeb3Network(network);
        const result = await web3.eth.getBlock(blockNumber, true);
        if (!result) return [];
        return result.transactions;
    }

    async getTransactionReceipt(transactionHash) {
        return await web3.eth.getTransactionReceipt(transactionHash);
    }

    async decodedInputData(decodedData) {
        const parameterTypes = ['address', 'uint256'];
        //? remove the function signature (first 4 bytes) from the encoded value
        const encodedParams = decodedData.slice(10);
        //? decode the parameters using web3.eth.abi.decodeParameters
        return web3.eth.abi.decodeParameters(parameterTypes, encodedParams);
    }

}

module.exports = Web3helper;




