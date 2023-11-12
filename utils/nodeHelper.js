const path = require('path');
const { execSync } = require('child_process');
const { PublicPath } = require('../index');

//? utils
const { hexToDecimal } = require('../utils/walletHelper');
const { NetworkSymbol } = require('../utils/index');

class NodeHelper {

    getRippleBalance = (address) => {
        let value = 0;
        const output = execSync(`cd ${path.join(PublicPath, 'public', 'ripple')} && node ripple_balance.js "${address}"`);
        console.log(output);

        if (!output) return value;

        const JsonValue = JSON.parse(output);
        if (JsonValue && JsonValue[0].currency === NetworkSymbol.XRP) {
            value = JsonValue[0].value;
        }
        return value;
    }

    getTrc20Balance = (address, decimalPoint) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node balance.js ${address}`;
        const output = execSync(command).toString();
        const res = JSON.parse(output);
        //Logger.debug(`CheckTrxBalance ${addr} response ${JSON.stringify(output)}`);
        return res / Math.pow(10, decimalPoint);
    }

    getTrc20TokenBalance = (contract, address, decimalPoint) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node trcBalance.js ${contract} ${address}`;
        const output = execSync(command).toString();
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
            const output = execSync(command).toString();
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
            const output = execSync(command).toString();
            const res = JSON.parse(output);
            return res;
        }
        catch (error) {
            return 0;
        }
    }

}


module.exports = NodeHelper;