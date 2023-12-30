const axios = require('axios');

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

//It is recommended to use ethers4.0.47 version
let host = 'https://nile.trongrid.io/wallet/estimateenergy';
// var ethers = require('ethers')
// const AbiCoder = ethers.utils.AbiCoder;
const ADDRESS_PREFIX_REGEX = /^(41)/;


class TronHelper {
    toHex = (text) => {
        return tronWeb.address.toHex(text);
    }

    getTransactionById = async (txId) => {
        const response = await tronWeb.trx.getTransaction(txId);
        if (!response) return null;
        return JSON.parse(response);
    }

    //? encode parameter
    encodeParams = async (inputs) => {
        let typesValues = inputs
        let parameters = ''
        if (typesValues.length == 0)
            return parameters
        /// const abiCoder = new AbiCoder();
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
            //    parameters = abiCoder.encode(types, values).replace(/^(0x)/, '');
        } catch (ex) {
            console.log(ex);
        }
        return parameters
    }

    //? estimate energy
    estimateEnergy = async (contractAddress, senderAddress, receiverAddress, amount) => {
        let contractAddress_hex = tronWeb.address.toHex(contractAddress);
        let senderAddress_hex = tronWeb.address.toHex(senderAddress);
        let receiverAddress_hex = tronWeb.address.toHex(receiverAddress);
        let inputs = [
            { type: 'address', value: senderAddress_hex },
            { type: 'uint256', value: amount }
        ]
        let data = await this.encodeParams(inputs);
        console.log("data: ", data);
        let result = await axios.post(host, {
            "owner_address": senderAddress,
            "contract_address": contractAddress,
            "function_selector": "transfer(address,uint256)",
            "parameter": data,
            "visible": true
        });
        console.log(result.data)
    }
}


module.exports = TronHelper;