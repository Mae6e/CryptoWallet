const path = require('path');
const axios = require('axios');

const { exec } = require('child_process');
const { PublicPath } = require('../index');

//? utils
const { hexToDecimal } = require('../utils/walletHelper');
const { NetworkSymbol, ExplorerRipple, ExplorerTrc20,
    web3GasLimit, web3TokenGasLimit,
    TronGridKey, TrxEnergyFee, TrxBandWidthFee } = require('../utils');

//? logs
const logger = require('../logger')(module);


class NodeHelper {

    //? execute command and added log
    executeCommand = (command) => {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (stderr) {
                    //? If an error occurred, reject the promise with the error
                    console.log(stderr);
                    logger.error('executeCommand-error', null, stderr);
                    resolve(false);
                } else {
                    //? resolve the promise with the output
                    resolve(stdout);
                }
            });
        });
    }

    generateTrc20Wallet = async () => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node address.js`;
        const output = await this.executeCommand(command);
        if (!output) return false;
        return JSON.parse(output);
    }

    generateWeb3Wallet = async (web3NetworkType) => {
        const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node address.js ${web3NetworkType}`;
        const output = await this.executeCommand(command);
        if (!output) return false;
        return JSON.parse(output);
    }

    getRippleBalance = async (address) => {
        let value = 0;
        const command = `cd ${path.join(PublicPath, 'public', 'ripple')} && node ripple_balance.js ${address}`;
        const output = await this.executeCommand(command);
        if (!output) return value;
        const JsonValue = JSON.parse(output);

        if (JsonValue && JsonValue[0].currency === NetworkSymbol.XRP) {
            value = JsonValue[0].value;
        }
        return value;
    }

    getTrc20Balance = async (address, decimalPoint) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node balance.js ${address}`;
        const output = await this.executeCommand(command);
        if (!output) return 0;
        const res = JSON.parse(output);
        return res / Math.pow(10, decimalPoint);
    }

    getTrc20TokenBalance = async (contract, address, decimalPoint) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node trcBalance.js ${contract} ${address}`;
        const output = await this.executeCommand(command);
        if (!output) return 0;

        const res = JSON.parse(output);
        if (res && typeof res === 'object') {
            if (res.hex) {
                return hexToDecimal(res.hex) / Math.pow(10, decimalPoint);
            }
        }
        return 0;
    }

    getWeb3Balance = async (network, address) => {
        const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node balance.js ${network} ${address}`;
        const output = await this.executeCommand(command);
        if (!output) return 0;
        const res = JSON.parse(output);
        return res;
    }

    getWeb3TokenBalance = async (network, contract, address) => {
        try {
            const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node tokenBalance.js ${network} ${contract} ${address}`;
            const output = await this.executeCommand(command);
            if (!output) return 0;
            const res = JSON.parse(output);
            return res;
        }
        catch (error) {
            return 0;
        }
    }


    signWeb3Transaction = async (args) => {
        const joinedValue = Object.values(args).join(' ');
        const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node sendTrans.js ${joinedValue}`;
        const output = await this.executeCommand(command);
        if (!output) return output;
        const data = JSON.parse(output);
        return data;
    }

    signWeb3TokenTransaction = async (args) => {
        const joinedValue = Object.values(args).join(' ');
        const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node sendToken.js ${joinedValue}`;
        const output = await this.executeCommand(command);
        if (!output) return output;
        const data = JSON.parse(output);
        return data;
    }

    estimateWeb3Fee = async (network) => {
        const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node getGasPrice.js ${network}`;
        const output = await this.executeCommand(command);
        if (!output) return 0;
        const res = JSON.parse(output);
        return {
            fee: res * web3GasLimit,
            tokenFee: res * web3TokenGasLimit
        };
    }

    calculateWeb3TokenFee = async (args) => {
        const joinedValue = Object.values(args).join(' ');
        const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node estimateContractGas.js ${joinedValue}`;
        const output = await this.executeCommand(command);
        if (!output) return 0;
        const res = JSON.parse(output);
        return Number(res);
    }


    printLedgerResult = async (id, method, params) => {
        const body = { id, method, params: [params] };
        const response = await axios({
            'method': 'post',
            'url': ExplorerRipple,
            'headers': {
                'Content-Type': 'application/json'
            },
            'data': body
        });

        return response;
    }

    getRippleLedgerTransactions = async (input) => {
        try {
            const { account, initialBlockIndex, endBlockIndex } = input;
            let params = {
                account,
                forward: 'true',
                limit: 100,
                ledger_index_min: initialBlockIndex,
                ledger_index_max: endBlockIndex
            };

            let resultArray = [];
            do {
                const response = await this.printLedgerResult(1, 'account_tx', params);

                const { data } = response;
                if (!response || !data) break;

                const { status, transactions, marker } = data.result;
                if (!transactions || status !== 'success') break;

                resultArray = resultArray.concat(transactions.filter(x => x.tx).map(x => x.tx));
                if (!marker)
                    break;

                //? add the marker to continue querying - pagination
                params.marker = marker;

            } while (true);

            return resultArray;
        } catch (error) {
            console.error('Error:', error.message);
            logger.error('getRippleLedgerTransactions|exception', null, error.stack);
            return 0;
        }
    }


    getLastLedgerIndex = async () => {
        try {
            const response = await this.printLedgerResult(2, 'ledger_current');
            const { data } = response;
            if (!response || !data) return 0;
            const { ledger_current_index } = data.result;
            return ledger_current_index;
        }
        catch (error) {
            console.error('Error:', error.message);
            logger.error('getLastLedgerIndex|exception', null, error.stack);
            return 0;
        }
    }

    getTrc20BlockTransactions = async (start, end) => {
        let blocks = { startNum: start, endNum: end };
        if (blocks.startNum === blocks.endNum)
            blocks.endNum += 1;

        const range = JSON.stringify(blocks);
        try {
            const response = await axios.post(ExplorerTrc20, range, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'TRON-PRO-API-KEY': TronGridKey
                }
            });

            const result = response.data;
            if (!result['block'] || result['block'].length === 0) {
                logger.error(`getTrc20BlockTransactions|deposit block has empty results`, { blocks, result });
                console.log(`Something went wrong ${JSON.stringify(result)}`);
                return 0;
            }
            return result['block'];

        } catch (error) {
            console.error('Error:', error.message);
            logger.error('getTrc20BlockTransactions|exception', null, error.stack);
            return 0;
        }
    }

    signRippleTransaction = async (args) => {
        const joinedValue = Object.values(args).join(' ');
        const command = `cd ${path.join(PublicPath, 'public', 'ripple')} && node ripple_sendcoins.js ${joinedValue}`;
        const output = await this.executeCommand(command);
        if (!output) return output;
        const data = JSON.parse(output);
        return data;
    }


    signTrc20Transaction = async (args) => {
        const joinedValue = Object.values(args).join(' ');
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node sendTrans.js ${joinedValue}`;
        const output = await this.executeCommand(command);
        if (!output) return output;
        const data = JSON.parse(output);
        return data;
    }


    signTrc20TokenTransaction = async (args) => {
        const joinedValue = Object.values(args).join(' ');
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node sendToken.js ${joinedValue}`;
        const output = await this.executeCommand(command);
        if (!output) return output;
        const data = JSON.parse(output);
        return data;
    }

    rippleGenerateAddress = async () => {
        const command = `cd ${path.join(PublicPath, 'public', 'ripple')} && node ripple_generate_address.js`;
        const output = await this.executeCommand(command);
        if (!output) return output;
        const res = JSON.parse(output);
        return res;
    }

    trc20TriggerConstant = async (args) => {
        const { address, to, amount, contractAddress } = args;
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node triggerconstrant.js ${address} ${to} ${amount} ${contractAddress}`;
        const output = await this.executeCommand(command);
        if (!output) return 0;
        const data = JSON.parse(output);
        return data;
    }

    trc20GetAccountResources = async (address) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node accountResources.js ${address}`;
        const output = await this.executeCommand(command);
        if (!output) return 0;
        const data = JSON.parse(output);
        return data;
    }

    trc20EstimateBandwidth = (raw_data_hex) => {
        //? length of transaction + length of typical signature length
        if (!raw_data_hex) return 0;
        return raw_data_hex.length + 64;
    }

    trc20GetEnergy = (args) => {
        return args.EnergyLimit - args.EnergyUsed;
    }

    trc20GetBandwidth = (args) => {
        const totalBandwidth = args.freeNetLimit + args.NetLimit;
        const totalBandwidthUsed = args.NetUsed + args.freeNetUsed;
        return totalBandwidth - totalBandwidthUsed;
    }

    calculateTrc20TokenFee = async (args) => {
        const { address, to, amount, contractAddress } = args;
        const account = await this.trc20GetAccountResources(address);
        if (!account) return 0;

        const currentEnergy = this.trc20GetEnergy({
            EnergyLimit: account.EnergyLimit || 0,
            EnergyUsed: account.EnergyUsed || 0
        });

        const currecntBandwidth = this.trc20GetBandwidth({
            freeNetLimit: account.freeNetLimit || 0,
            NetLimit: account.NetLimit || 0,
            NetUsed: account.NetUsed || 0,
            freeNetUsed: account.freeNetUsed || 0
        });

        const estimateTrxResponse = await this.trc20TriggerConstant({
            address, to, amount, contractAddress
        });

        logger.debug('calculateTrc20TokenFee-beforeCalculate', { account, estimateTrxResponse });

        if (!estimateTrxResponse) return 0;

        const estimateEnergy = estimateTrxResponse.energy_used || 0;
        const estimateBandwidth = this.trc20EstimateBandwidth(estimateTrxResponse.transaction.raw_data_hex);

        if (!estimateBandwidth) return 0;

        let burnTrx_Energy = 0;
        let burnTrx_Bandwidth = 0;

        if (currentEnergy < estimateEnergy) {
            burnTrx_Energy = (estimateEnergy - currentEnergy) * TrxEnergyFee;
        }
        if (currecntBandwidth < estimateBandwidth) {
            burnTrx_Bandwidth = (estimateBandwidth - currecntBandwidth) * TrxBandWidthFee;
        }

        logger.info('calculateTrc20TokenFee-info', {
            currentEnergy,
            estimateEnergy,
            currecntBandwidth,
            estimateBandwidth,
            burnTrx_Energy,
            burnTrx_Bandwidth
        });

        //? get essential fee per tron
        return (burnTrx_Bandwidth + burnTrx_Energy);
    }

}


module.exports = NodeHelper;
