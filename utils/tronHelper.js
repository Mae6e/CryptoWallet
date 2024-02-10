const axios = require('axios');

const { TronGridUrl } = require('../utils');

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);


var ethers = require('ethers')
const AbiCoder = ethers.utils.AbiCoder;
const ADDRESS_PREFIX_REGEX = /^(41)/;

class TronHelper {
    toHex = (text) => {
        return tronWeb.address.toHex(text);
    }

    getCurrentBlock = async () => {
        const response = await tronWeb.trx.getNodeInfo();
        if (!response || !response.block) return 0;

        const index = response.block.split(',')[0].replace('Num:', '').trim();
        if (!index) return 0;
        return Number(index);
    }

    getTransactionById = async (txId) => {
        const response = await tronWeb.trx.getTransaction(txId);
        return response;
    }

    checkAccountIsNew = async (address) => {
        try {
            console.log(address);
            const account = await tronWeb.trx.getAccount(address);
            console.log(account);

            if (Object.keys(account).length === 0) return true;
            return false;
        } catch (error) {
            console.error('Error occurred:', error.message);
            return false;
        }
    }


    encodeParams = async (inputs) => {
        let typesValues = inputs
        let parameters = ''
        if (typesValues.length == 0)
            return parameters
        const abiCoder = new AbiCoder();
        let types = [];
        const values = [];
        for (let i = 0; i < typesValues.length; i++) {
            let { type, value } = typesValues[i];
            if (type == 'address')
                value = value.replace(ADDRESS_PREFIX_REGEX, '0x');
            else if (type == 'address[]')
                value = value.map(v => toHex(v).replace(ADDRESS_PREFIX_REGEX, '0x'));
            types.push(type);
            values.push(value);
        }
        try {
            parameters = abiCoder.encode(types, values).replace(/^(0x)/, '');
        } catch (ex) {
            console.log(ex);
        }
        return parameters
    }

    //! can use triggerConstantContract in public folder too
    estimateEnergy = async (contractAddress, senderAddress, receiverAddress, amount) => {
        let receiverAddress_hex = tronWeb.address.toHex(receiverAddress);
        let inputs = [
            { type: 'address', value: receiverAddress_hex },
            { type: 'uint256', value: amount }
        ]
        let data = await this.encodeParams(inputs);
        let result = await axios.post(`${TronGridUrl}/wallet/triggerconstantcontract`, {
            "owner_address": senderAddress,
            "contract_address": contractAddress,
            "function_selector": "transfer(address,uint256)",
            "parameter": data,
            "visible": true
        });
        console.log(result.data)
        return result.data;
    }

}


module.exports = TronHelper;