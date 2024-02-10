
const { Web3 } = require('web3');
const abiCoder = require("web3-eth-abi");

const { NetworkType } = require('./constants');
const { Web3Networks } = require('./../utils');

const topic = process.env.TOPIC_WEB3;


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


    fromWei(network, value) {
        const web3 = this.initialWeb3Network(network);
        return web3.utils.fromWei(value, 'ether');
    }

    toWei(network, value) {
        const web3 = this.initialWeb3Network(network);
        return web3.utils.toWei(value, 'ether');
    }

    fromGWei(network, value) {
        const web3 = this.initialWeb3Network(network);
        return web3.utils.fromWei(value, 'gwei');
    }

    toGWei(network, value) {
        const web3 = this.initialWeb3Network(network);
        return web3.utils.toWei(value, 'gwei');
    }

    getWeb3Network(networkType) {
        try {
            const [key, value] = Object.entries(NetworkType)
                .find(([key, value]) => value == networkType) || [];
            for (const network of Web3Networks) {
                if (key === network) {
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
        if (!result) return [];
        return result.transactions;
    }

    async getTransactionReceiptByHash(network, transactionHash) {
        try {
            const web3 = this.initialWeb3Network(network);
            let response = await web3.eth.getTransactionReceipt(transactionHash);
            if (!response) return null;
            return response;
        } catch (error) {
            return null;
        }
    }

    async getContractTransactionsByHash(network, transactionHash) {
        const web3 = this.initialWeb3Network(network);
        let response = await web3.eth.getTransactionReceipt(transactionHash);

        let data = [];
        if (response.status !== BigInt(1))
            return data;

        if (response.logs && response.logs.length > 0) {
            for (const item of response.logs) {
                if (item.topics[0] === topic && item.data !== '0x') {
                    const transaction = abiCoder.decodeLog([{
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

                    if (!transaction.from || !transaction.to) continue;

                    data.push({
                        from: transaction.from.toLowerCase(),
                        to: transaction.to.toLowerCase(),
                        value: transaction.value,
                        contract: item.address.toLowerCase(),
                        hash: transactionHash
                    });
                }
            }
        }
        return data;
    }


    //? track main currency and tokens transactions
    filterTransactions = async ({ transactions, sitePublicKey, networkType }) => {
        const adminTransactions = [];
        const recipientTransactions = [];

        //? find transactions for main currency and tokens
        for (const txObject of transactions) {
            const { to, value, hash, from, input } = txObject;
            if (from === to) continue;

            if (value === BigInt(0) || input !== '0x') {
                const response = await this.getContractTransactionsByHash(networkType, hash);
                for (const tokenData of response) {
                    if (tokenData.to === sitePublicKey) {
                        adminTransactions.push(tokenData);
                    } else if (tokenData.from !== sitePublicKey) {
                        recipientTransactions.push(tokenData);
                    }
                }

            } else if (to) {
                const toLowerCase = to.toLowerCase();
                if (toLowerCase === sitePublicKey) {
                    adminTransactions.push({ to: toLowerCase, value, hash, from });
                } else if (from !== sitePublicKey) {
                    recipientTransactions.push({ to: toLowerCase, value, hash, from });
                }
            }
        }

        return { adminTransactions, recipientTransactions };
    }

}

module.exports = Web3helper;




