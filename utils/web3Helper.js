
const { Web3 } = require('web3');
const { NetworkType } = require('./constants');
const { Web3Networks } = require('./../utils');


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


    getWeb3Network(networkType) {
        try {
            const [key, value] = Object.entries(NetworkType)
                .find(([key, value]) => value == networkType) || [];
            for (const network of Web3Networks) {
                if (key === network) {
                    console.log(key);
                    return value;
                }
            }
            return undefined;
        }
        catch (error) {
            console.log(error.messgae)
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

        // const decodedData = web3.eth.abi.decodeParameters(['address', 'address', 'uint256'],
        //     '0x49c36c07000000000000000000000000172fcd41e0913e95784454622d1c3724f546f8490000000000000000000000000000000000000000000000023c16589049329898000000000000000000000000000000000000000010ce69d6f3a5af0000000000000000000000000000000000000000000000000010cf38b5974e7a00000000000000000000000000000000000000000000000000000000000000000000000000'
        // );


        let decodedData = web3.eth.abi.decodeParameters(
            ["uint256", "uint256", "address[]", "address", "uint256"],
            "0x49c36c07000000000000000000000000172fcd41e0913e95784454622d1c3724f546f8490000000000000000000000000000000000000000000000023c16589049329898000000000000000000000000000000000000000010ce69d6f3a5af0000000000000000000000000000000000000000000000000010cf38b5974e7a00000000000000000000000000000000000000000000000000000000000000000000000000"
        );

        // const decodedData = web3.eth.abi.decodeParameters(
        //     ["uint256", "uint256", "address[]", "address", "uint256"],
        //     "000000000000000000000000000000000000000000000001885c663d0035bce200000000000000000000000000000000000000000000000000f5666f7fdaa62600000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000c0be713b48822271b362e9fac00479f5134172e80000000000000000000000000000000000000000000000000000000060e93fa900000000000000000000000000000000000000000000000000000000000000020000000000000000000000009813037ee2218799597d83d4a5b6f3b6778218d9000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
        // );

        console.log(decodedData);
        if (!result) return [];
        return result.transactions;
    }

    async getTransactionReceiptByHash(network, transactionHash) {
        const web3 = this.initialWeb3Network(network);
        let rsponse = await web3.eth.getTransactionReceipt(transactionHash);
        if (!rsponse) return null;
        return rsponse;
    }

    async getContractTransactionsByHash(network, transactionHash) {
        const web3 = this.initialWeb3Network(network);
        let rsponse = await web3.eth.getTransactionReceipt(transactionHash);

        let data = [];
        if (rsponse.status !== '1') {
            return data;
        }
        if (rsponse.logs && rsponse.logs.length > 0) {
            for (let i = 0; i < rsponse.logs.length; i++) {
                const item = rsponse.logs[i];
                if (item.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
                    && item.data !== '0x') {
                    let txObject = {};
                    txObject.contract = item.address;
                    txObject.hash = transactionHash;

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

                    txObject.from = transaction.from.toLowerCase();
                    txObject.to = transaction.to.toLowerCase();
                    txObject.value = transaction.value.toString();
                    data.push(txObject);
                }
            }
        }
        return data;
    }

}

module.exports = Web3helper;




