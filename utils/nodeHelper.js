
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
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node balance.js ${address}`;
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
            console.log("this is get balances")
            let url;
            switch (network) {
                case NetworkName.ERC20:
                    url = process.env.RPC_ENDPOINT_ERC20;
                    break;
                case NetworkName.BSC:
                    url = process.env.RPC_ENDPOINT_BSC;
                    break;
                case NetworkName.ARBITRUM:
                    url = process.env.RPC_ENDPOINT_ARBITRUM;
                    break;
                case NetworkName.POLYGON:
                    url = process.env.RPC_ENDPOINT_POLYGON;
                    break;
                default:
                    throw new Error('Invalid network');
            }

            //Logger.debug(`bnbFunction req ${url} method ${method} data = ${JSON.stringify(data)}`);



            const requestData = {
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 2,
            };

            console.log("nnnnnnnnnn", url);

            const postData = JSON.stringify(requestData);

            const requestOptions = {
                host: url,
                port: 443,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);

            const getBal = execSync(`curl -X ${requestOptions.method} -H "Content-Type: application/json" --data '${postData}' ${url}`).toString('utf8');

            console.log("rwurwereurewuruw rwuruweru");
            console.log(getBal);


            const decodeBal = JSON.parse(getBal);
            let balance = 0;

            console.log("herere");
            console.log(decodeBal);

            if (decodeBal.result) {
                const userBal = bchexdec(decodeBal.result);
                balance = userBal / 1_000_000_000_000_000_000;
            }
            return balance;
        } catch (error) {
            //TODO Handle any error that occurs during the execution
            console.error(error);
            return 0;
        }
    }


    getWeb3TokenBalance = (network, address, contract) => {
        try {
            let url;
            switch (network) {
                case NetworkName.ERC20:
                    url = process.env.RPC_ENDPOINT_ERC20;
                    break;
                case NetworkName.BSC:
                    url = process.env.RPC_ENDPOINT_BSC;
                    break;
                case NetworkName.ARBITRUM:
                    url = process.env.RPC_ENDPOINT_ARBITRUM;
                    break;
                case NetworkName.POLYGON:
                    url = process.env.RPC_ENDPOINT_POLYGON;
                    break;
                default:
                    throw new Error('Invalid network');
            }

            // ini_set('memory_limit', '2048M');
            // ini_set('max_execution_time', '600');

            const requestOptions = {
                host: url,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            //Logger.debug(`getTokenBalance req ${url} network ${network} address ${address} contract ${contract}`);

            const requestData = {
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{ to: contract, data: `0x70a08231${address.substr(2)}` }, 'latest'],
                id: 2,
            };

            requestOptions.path = '/';
            requestOptions.method = 'POST';
            const postData = JSON.stringify(requestData);
            requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);

            const getBal = execSync(`curl -X ${requestOptions.method} -H "Content-Type: application/json" --data '${postData}' ${url}`);

            console.log("rwurwereurewuruw rwuruweru");
            console.log(getBal);

            const decodeBal = JSON.parse(getBal);
            const bal = decodeBal.result || 0;
            const userBal = bchexdec(bal);
            return userBal;
        } catch (error) {
            //TODO Handle any error that occurs during the execution
            console.error(error);
            return 0;
        }
    }
}



module.exports = NodeHelper;
