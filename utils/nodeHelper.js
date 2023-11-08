const path = require('path');
const { execSync } = require('child_process');
const { PublicPath } = require('../index');

//? utils
const { NetworkName } = require('../utils');
const { bchexdec } = require('../utils/walletHelper');

class NodeHelper {

    getRippleBalance = (address) => {
        let value = 0;
        const output = execSync(`cd ${path.join(PublicPath, 'public', 'ripple')} && node ripple_balance.js "${address}"`);
        const JsonValue = JSON.parse(output);
        if (JsonValue && JsonValue[0].currency === NetworkSymbol.XRP) {
            value = JsonValue[0].value;
        }
        return value;
    }

    getTrc20Balance = (address) => {
        console.log("sjdjfdsjfjds");
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node balance.js ${address}`;

        console.log(command);

        const output = execSync(command).toString();
        const res = JSON.parse(output);
        //Logger.debug(`CheckTrxBalance ${addr} response ${JSON.stringify(output)}`);
        return res;
    }

    getTrc20TokenBalance = (contract, address) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node trcBalance.js ${contract} ${address}`;
        const output = execSync(command).toString();
        const res = JSON.parse(output);

        if (res && typeof res === 'object') {
            if (res.hex) {
                return bchexdec(res.hex);
            }
        }
        return 0;
    }


    getWeb3Balance = (network, address) => {
        try {
            console.log('this is');
            console.log(network);
            console.log(address);
            const command = `cd ${path.join(PublicPath, 'public', 'web3')} && node balance.js ${network} ${address}`;

            console.log(command);

            const output = execSync(command).toString();
            console.log(output);
            const res = JSON.parse(output);

            console.log(res);

            return 0;
        }
        catch (error) {
            return 0;
        }
    }

}



module.exports = NodeHelper;
