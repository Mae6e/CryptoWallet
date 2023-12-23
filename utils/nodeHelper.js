const path = require('path');
const axios = require('axios');

const { execSync } = require('child_process');
const { PublicPath } = require('../index');

//? utils
const { hexToDecimal } = require('../utils/walletHelper');
const { NetworkSymbol } = require('../utils/index');

const { TronGridKey } = require('../utils');

class NodeHelper {


    executeCommand = (command) => {
        const output = execSync(command);
        return output.toString();
    }

    getRippleBalance = (address) => {
        let value = 0;
        const command = `cd ${path.join(PublicPath, 'public', 'ripple')} && node ripple_balance.js ${address}`;
        const output = this.executeCommand(command);

        if (!output) return value;
        const JsonValue = JSON.parse(output);

        if (JsonValue && JsonValue[0].currency === NetworkSymbol.XRP) {
            value = JsonValue[0].value;
        }
        return value;
    }

    getTrc20Balance = (address, decimalPoint) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node balance.js ${address}`;
        const output = this.executeCommand(command);
        const res = JSON.parse(output);
        return res / Math.pow(10, decimalPoint);
    }

    getTrc20TokenBalance = (contract, address, decimalPoint) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node trcBalance.js ${contract} ${address}`;
        const output = this.executeCommand(command);
        const res = JSON.parse(output);

        if (res && typeof res === 'object') {
            if (res.hex) {
                return hexToDecimal(res.hex) / Math.pow(10, decimalPoint);
            }
        }
        return 0;
    }


    getWeb3Balance = (network, address) => {
        try {
            const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node balance.js ${network} ${address}`;
            const output = this.executeCommand(command);
            const res = JSON.parse(output);
            return res;
        }
        catch (error) {
            return 0;
        }
    }

    getWeb3TokenBalance = (network, contract, address, decimalPoint) => {
        try {
            const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node tokenBalance.js ${network} ${contract} ${address} ${decimalPoint}`;
            const output = this.executeCommand(command);
            const res = JSON.parse(output);
            return res;
        }
        catch (error) {
            return 0;
        }
    }

    printLedgerResult = async (method, params) => {
        const body = { method, params };
        console.log(body);
        return await axios.post(process.env.EXPLORER_RIPPLE, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: body
        });
    }

    getRippleLedgerTransactions = async (params) => {
        try {
            const { account, start, end } = params;
            let data = {
                account, ledger_index_min: -1,
                ledger_index_max: -1
            };
            let transations = [];
            do {
                // const body = JSON.stringify([data]);
                const response = await this.printLedgerResult('account_tx', [data]);
                console.log(response.warnings)
                if (!response || !response.result) break;

                array.push({ ...response.result.transactions });
                if (!response.result.marker) {
                    break;
                }

                //? add the marker to continue querying - pagination
                data.marker = response.result.marker;

            } while (true);

            console.log(transations);
            return transations;
        } catch (error) {
            console.error('Error:', error.message);
            return [];
        }
    }


    getTrc20BlockTransactions = async (start, end) => {
        const blocks = { startNum: start, endNum: end };
        const range = JSON.stringify(blocks);
        try {
            const response = await axios.post(process.env.EXPLORER_TRC20, range, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'TRON-PRO-API-KEY': TronGridKey
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error:', error.message);
            return [];
        }
    }

    signRippleTransaction = (args) => {
        const command = `cd ${path.join(PublicPath, 'public', 'ripple')} && node ripple_sendcoins.js ${args.join(' ')}`;
        const output = this.executeCommand(command);
        return output;
    }

    signTrc20Transaction = (args) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node sendTrans.js ${args.join(' ')}`;
        const output = this.executeCommand(command);
        const data = JSON.parse(output);
        return data;
    }

    signTrc20TokenTransaction = (args) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node sendToken.js ${args.join(' ')}`;
        const output = this.executeCommand(command);
        const data = JSON.parse(output);
        return data;
    }

    trc20TriggerConstant = (address, to, contractAddress, amount) => {
        const args = { address, to, contractAddress, amount };
        //logger.info("Start triggerConstrnt node triggerconstrant.js {$address} {$to} {$amount} {$contractAddrss}");
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node triggerconstrant.js ${args.join(' ')}`;
        const output = this.executeCommand(command);
        const data = JSON.parse(output);
        //Logger:: info("triggerConstrnt adddrss {$address} to {$to} contract {$contractAddrss} output ".json_encode($output));
        return data;
    }

}


module.exports = NodeHelper;
