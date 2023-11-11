
const CoinPayments = require('coinpayments');
const path = require('path');

const { execSync } = require('child_process');

const { PublicPath } = require('../index');
const Response = require('../utils/response');

const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const UserAddressRepository = require('../repositories/userAddressRepository');
const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');

//? utils
const {
    CoinPaymentPrivateKey,
    CoinPaymentPublicKey,
    XRPAddress,
    CoinpaymentCurrencies,
    Web3Networks,
    NetworkName,
    NetworkSymbol } = require('../utils');

const { CurrencyType } = require('../utils/constants');

const { randomString } = require('../utils/walletHelper');
const { encryptText } = require('../utils/cryptoEngine');


class WalletAddressService {

    constructor() {
        this.privateKey = CoinPaymentPrivateKey;
        this.publicKey = CoinPaymentPublicKey;
    }

    getWeb3Network = (networkName) => {
        for (const key of Web3Networks) {
            if (networkName.includes(key)) {
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

        let { symbol, networkName } = data;
        if (!symbol || !networkName) {
            return Response.warn('Please Enter Network and Currency Information');
        }

        const network = await NetworkRepository.getNetworkByName(networkName);
        if (!network) {
            return Response.warn('Invalid Network');
        }

        const currency = await CurrenciesRepository.getCurrencyBySymbol(symbol, network._id);
        if (!currency) {
            return Response.warn('Invalid Currency');
        }

        let web3Network;
        if (networkName) {
            networkName = networkName.toUpperCase();
            web3Network = this.getWeb3Network(networkName);
        }

        if (CoinpaymentCurrencies.includes(symbol)) {
            const coinPaymentsAPI = new CoinPayments({
                key: this.publicKey,
                secret: this.privateKey
            });
            const result = await coinPaymentsAPI.balances();
            return 0;
        }
        else if (networkName.includes(NetworkName.RIPPLE)) {
            if (currency.type === CurrencyType.COIIN) {
                console.log('hererer hererer');

                const adminAddress = network.siteWallet.publicKey;
                const balance = nodeHelper.getRippleBalance(adminAddress);
                console.log(balance);
                return Response.success({ balance, address: adminAddress });
            } else {
                return Response.warn('Currently, do not support currency');
            }
        }
        else if (networkName.includes(NetworkName.TRC20)) {
            if (currency.type === CurrencyType.COIIN) {
                const adminAddress = network.siteWallet.publicKey;
                const balance = nodeHelper.getTrc20Balance(adminAddress);
                return Response.success({ balance, address: adminAddress });
            }
            else {
                const adminAddress = network.siteWallet.publicKey;
                const contract = currency.networks[0].contractAddress;
                const tokenBal = nodeHelper.getTrc20TokenBalance(contract, adminAddress);
                //TODO add unit in db - usdt
                const balance = tokenBal / 1_000_000;
                return Response.success({ balance, address: adminAddress });
            }
        }
        else if (web3Network) {
            if (currency.type === CurrencyType.COIIN) {
                const adminAddress = network.siteWallet.publicKey;
                const getBalance = nodeHelper.getWeb3Balance(web3Network, adminAddress);
                return Response.success({ balance: getBalance, address: adminAddress });
            }
            else {
                const adminAddress = network.siteWallet.publicKey;
                const contract = currency.networks[0].contractAddress;
                const getBalance = nodeHelper.getWeb3TokenBalance(web3Network, contract, adminAddress);
                const balance = getBalance / 1000_000_000_000_000_000;
                return Response.success({ balance, address: adminAddress });
            }
        }
        else {
            return Response.warn('Invalid request');
        }

    }
}

module.exports = WalletAddressService;