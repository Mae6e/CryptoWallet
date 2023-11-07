
const { execSync } = require('child_process');
const { PublicPath } = require('../index');

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

    getTrc20TokenBalance = (contractAddress, address) => {
        const command = `cd ${path.join(PublicPath, 'public', 'tron')} && node trcBalance.js ${contractAddress} ${address}`;
        const output = execSync(command).toString();
        const res = JSON.parse(output);

        if (res && typeof res === 'object') {
            if (res.hex) {
                return bchexdec(res.hex);
            }
        }
        return 0;
    }


    getTokenBalance = (network, address, contract) => {
        try {
            let url;
            switch (network) {
                case 'ethereum':
                    url = 'https://ethereum-rpc.example.com'; // Replace with the appropriate Ethereum RPC endpoint URL
                    break;
                case 'bsc':
                    url = 'https://bsc-rpc.example.com'; // Replace with the appropriate Binance Smart Chain RPC endpoint URL
                    break;
                case 'arbitrum':
                    url = 'https://arbitrum-rpc.example.com'; // Replace with the appropriate Arbitrum RPC endpoint URL
                    break;
                case 'polygon':
                    url = 'https://polygon-rpc.example.com'; // Replace with the appropriate Polygon RPC endpoint URL
                    break;
                default:
                    throw new Error('Invalid network');
            }

            const requestOptions = {
                host: url,
                port: 443,
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
            const decodeBal = JSON.parse(getBal);
            const bal = decodeBal.result || 0;
            const userBal = bchexdec(bal);
            const response = { type: 'success', result: userBal };
            return response;
        } catch (error) {
            //TODO Handle any error that occurs during the execution
            console.error(error);
        }
    }
}



module.exports = NodeHelper;
