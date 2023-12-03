
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


    async getContractTransactionsByHash(network, transactionHash) {
        const web3 = this.initialWeb3Network(network);
        let rsponse = await web3.eth.getTransactionReceipt(transactionHash);

        let data = [];
        if (rsponse.logs && rsponse.logs.length > 0) {
            for (let i = 0; i < rsponse.logs.length; i++) {
                const item = rsponse.logs[i];
                if (item.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
                    && item.data !== '0x') {
                    let TxObject = {};
                    TxObject.contract = item.address;
                    TxObject.hash = transactionHash;

                    let transaction = web3.eth.abi.decodeLog([{
                        type: 'address',
                        name: 'from',
                        indexed: true
                    }, {
                        type: 'address',
                        name: 'to',
                        indexed: true
                    }, {
                        type: 'uint256',
                        name: 'value',
                        indexed: true
                    }],
                        item.index,
                        [item.topics[1], item.topics[2], item.data]);

                    TxObject.from = transaction.from;
                    TxObject.to = transaction.to;
                    TxObject.value = transaction.value.toString();
                    data.push(TxObject);

                    // if (item.topics[1] && item.topics[2]) {
                    //     trx.from = web3.eth.abi.decodeParameter('address', item.topics[1]);
                    //     trx.to = web3.eth.abi.decodeParameter('address', item.topics[2]);
                    //     trx.value = web3.eth.abi.decodeParameter('uint256', item.data).toString();
                    //     data.push(trx);
                    // }
                }
            }
            // logger.debug("trx data", { transactionHash, data });

        }
        return null;
    }

}

module.exports = Web3helper;




