
const CoinPayments = require('coinpayments');
const path = require('path');

const { execSync } = require('child_process');

const { PublicPath } = require('../index');
const Response = require('../utils/response');

const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const UserAddressRepository = require('../repositories/userAddressRepository');
const NetworkRepository = require('../repositories/networkRepository');

//? utils
const {
    CoinPaymentPrivateKey,
    CoinPaymentPublicKey,
    XRPAddress,
    CoinpaymentCurrencies,
    Web3Networks,
    NetworkName,
    NetworkSymbol } = require('../utils');

const { randomString } = require('../utils/walletHelper');
const { encryptText } = require('../utils/cryptoEngine');

class WalletAddressService {

    constructor() {
        this.privateKey = CoinPaymentPrivateKey;
        this.publicKey = CoinPaymentPublicKey;
    }

    getWeb3Network = (networkName) => {
        for (const key of Web3Networks) {
            if (key.includes(networkName)) {
                return key;
            }
        }
        return undefined;
    }

    generateXRPTag = async (len = 8) => {
        const characters = '123456789';
        const charactersLength = characters.length;
        let xrpTag = '';
        for (let i = 0; i < len; i++) {
            xrpTag += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        const checkKey = await UserAddressRepository.countOfTagByCurrency({ currency: 'XRP', tag: xrpTag });
        if (checkKey > 0) {
            return this.generateXRPTag(8);
        } else {
            return xrpTag;
        }
    }

    generateXLMTag = async (len = 12) => {
        const characters = '123456789';
        const charactersLength = characters.length;
        let xlmTag = '';
        for (let i = 0; i < len; i++) {
            xlmTag += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        const checkKey = await UserAddressRepository.countOfTagByCurrency({ currency: 'XLM', tag: xlmTag });
        if (checkKey > 0) {
            return this.generateXLMTag(12);
        } else {
            return xlmTag;
        }
    }

    generateAddress = async (data) => {
        let { networkSymbol, networkName } = data;

        if (!networkSymbol || !networkName) {
            return Response.warn('Please Enter Network Information');
        }

        let web3Network;
        if (networkName) {
            networkName = networkName.toUpperCase();
            web3Network = this.getWeb3Network(networkName);
        }

        if (CoinpaymentCurrencies.includes(networkSymbol)) {
            //? BTC, DOGE networks
            const coinPaymentsAPI = new CoinPayments({
                key: this.publicKey,
                secret: this.privateKey
            });
            const result = await coinPaymentsAPI.getCallbackAddress({ currency: networkSymbol });
            if (!result || !result.address) {
                return Response.warn('Currently, Can not get address');
            }
            const address = result.address;
            return Response.success({ address, tag: '', secret: '', public: '' });
        }
        else if (networkName.includes(NetworkName.RIPPLE)) {
            //? Ripple network
            const address = XRPAddress;
            const tag = await this.generateXRPTag(8);
            return Response.success({ address, tag, secret: '', public: '' });
        }
        else if (networkName.includes(NetworkName.TRC20)) {
            //? Assuming address.js is located in the 'tron' folder
            const output = execSync('cd ' + path.join(PublicPath, 'public', 'tron') + ' && node address.js').toString();

            if (!output)
                return Response.warn('Currently, Can not get output');

            const res = JSON.parse(output);

            console.log(output);
            if (res.address) {
                const key = encryptText(res.privateKey);
                const address = res.address.base58;
                const tag = res.address.hex;
                if (!key || !address || !tag) {
                    return Response.warn('Currently, Can not generate address');
                }
                return Response.success({ address, tag, secret: key, public: res.publicKey });
            }
            return Response.warn('Currently, Can not get address');
        }
        else if (web3Network) {
            //? Assuming address.js is located in the 'bep' folder
            const output = execSync('cd ' + path.join(PublicPath, 'public', 'web3') + ` && node address.js ${web3Network}`).toString();
            console.log(output);

            if (!output)
                return Response.warn('Currently, Can not get output');

            const getAddr = JSON.parse(output);
            console.log(getAddr);

            if (getAddr.address && getAddr.address !== "") {
                const address = getAddr.address.toLowerCase();
                const key = encryptText(getAddr.privateKey);
                if (!key) {
                    return Response.warn('Currently, Can not generate address');
                }
                return Response.success({ address, tag: randomString(25), secret: key, public: '' });
            }
            return Response.warn('Currently, Can not get address');
        }
        else {
            return Response.warn('Invalid request');
        }
    };

    getSiteWalletBalance = async (data) => {
        const { currency, networkName } = data;
        if (!data.currency || !networkName) {
            return Response.warn('Please Enter Network and Currency Information');
        }

        const network = await NetworkRepository.getNetworkByName(networkName);
        if (!network) {
            return Response.warn('Invalid Network');
        }

        //const bnbTokens = config.common.bnb_tokens;

        let web3Network;
        if (networkName) {
            networkName = networkName.toUpperCase();
            web3Network = this.getWeb3Network(networkName);
        }

        if (CoinpaymentCurrencies.includes(networkSymbol)) {

        }
        else if (networkName.includes(NetworkName.RIPPLE)) {
            if (currency === NetworkSymbol.XRP) {
                const adminAddress = network.siteWallet.publicKey;
                const balance = nodeHelper.getRippleBalance(adminAddress);
                return Response.success({ balance, address: adminAddress });
            } else {
                return Response.warn('Currently, do not support currency');
            }
        }
        else if (networkName.includes(NetworkName.TRC20)) {
            if (currency === NetworkSymbol.TRX) {
                const adminAddress = network.siteWallet.publicKey;
                const balance = nodeHelper.getTrc20Balance(adminAddress);
                return Response.success({ balance, address: adminAddress });
            }
            else {
                const adminAddress = network.siteWallet.publicKey;
                const conts = config.common.trx_contracts;
                const contract = conts[currency];
                const tokenBal = nodeHelper.getTrc20TokenBalance(contract, adminAddress);
                //TODO add unit in db
                const balance = tokenBal / 1000000;
                return Response.success({ balance, address: adminAddress });
            }
        }
        else if (web3Network) {

        }
        else {
            return Response.warn('Invalid request');
        }

        if (currency === 'XRP') {
            // const adminAddr = config.common.XRP.address;
            // let value = 0;
            // const output = ripple.execSync(`cd ${__dirname}/ripple && node ripple_balance.js "${adminAddr}"`);
            // const output1 = JSON.parse(output);
            // if (output1 && output1[0].currency === 'XRP') {
            //     value = output1[0].value;
            // }
            // return res.json({ status: 1, result: value, address: adminAddr });
        } else if (currency === 'TRX') {
            // const adminAddr = config.common.TRX.address;
            // const trxBal = getTrxBalance(adminAddr); // Assuming getTrxBalance is implemented
            // return res.json({ status: 1, result: trxBal, address: adminAddr });
        } else if (currency === 'BNB') {
            const adminAddr = config.common.BNB.address;
            const getBalance = ConnectBnb.bnbFunctions('checkBalance', { address: adminAddr });
            return res.json({ status: 1, result: getBalance.result, address: adminAddr });
        } else if (currency === 'USDT') {
            // const adminAddr = config.common.TRX.address;
            // const conts = config.common.trx_contracts;
            // const contract = conts[currency];
            // const tokenBal = getTokenBalance(contract, adminAddr, currency); // Assuming getTokenBalance is implemented
            // const balance = tokenBal / 1000000;
            // return res.json({ status: 1, result: balance, address: adminAddr });
        } else if (bnbTokens.includes(currency)) {
            const coin = SiteWallet.findOne({ type: currency }).select('password portnumber username');
            const contractAddr = coin.password;
            const decimalPoint = coin.portnumber;
            const adminAddr = coin.username;
            const getDecimals = decimalPoint + 1;
            const decimals = '1'.padEnd(getDecimals, '0');

            const balData = { address: adminAddr, contract: contractAddr };
            const getTokBal = ConnectBnb.bnbFunctions('tokenBalance', balData);
            const tokenBal = getTokBal.result;
            const balance = tokenBal / decimals;
            return res.json({ status: 1, result: balance, address: adminAddr });
        } else {
            return res.json({ status: 0 });
        }
    }
}

module.exports = WalletAddressService;