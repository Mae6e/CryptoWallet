const CoinPayments = require('coinpayments');
const path = require('path');

const { execSync } = require('child_process');

const { PublicPath } = require('../index');
const Response = require('../utils/response');

const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

const UserAddressRepository = require('../repositories/userAddressRepository');
const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');

//? utils
const {
    CoinPaymentPrivateKey,
    CoinPaymentPublicKey,
    XRPAddress,
    CoinpaymentCurrencies,
    Web3Networks
} = require('../utils');

const { CurrencyType, NetworkType } = require('../utils/constants');

const { randomString } = require('../utils/walletHelper');
const { encryptText } = require('../utils/cryptoEngine');


class WalletAddressService {

    constructor() {
        this.privateKey = CoinPaymentPrivateKey;
        this.publicKey = CoinPaymentPublicKey;
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
        let { networkSymbol, networkType } = data;

        if (!networkSymbol || !networkType) {
            return Response.warn('Please Enter Network Information');
        }

        let web3NetworkType;
        if (networkType) {
            web3NetworkType = web3Helper.getWeb3Network(networkType);
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
        else if (networkType == NetworkType.RIPPLE) {
            //? Ripple network
            const address = XRPAddress;
            const tag = await this.generateXRPTag(8);
            return Response.success({ address, tag, secret: '', public: '' });
        }
        else if (networkType == NetworkType.TRC20) {
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
        else if (web3NetworkType) {
            //? Assuming address.js is located in the 'bep' folder
            const command = 'cd ' + path.join(PublicPath, 'public', 'web3') + ` && node address.js ${web3NetworkType}`;
            const output = execSync(command).toString();
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

        let { symbol, networkType } = data;
        if (!symbol || !networkType) {
            return Response.warn('Please Enter Network and Currency Information');
        }

        const network = await NetworkRepository.getNetworkByType(networkType);
        if (!network) {
            return Response.warn('Invalid Network');
        }

        const currency = await CurrenciesRepository.getCurrencyBySymbol(symbol, network._id);
        if (!currency) {
            return Response.warn('Invalid Currency');
        }

        const networkObject = currency.networks.find(x => x.network.type === networkType);
        if (!networkObject) return Response.warn('Not found Network');

        let web3NetworkType;
        if (networkType) {
            web3NetworkType = web3Helper.getWeb3Network(networkType);
        }

        if (CoinpaymentCurrencies.includes(symbol)) {
            const coinPaymentsAPI = new CoinPayments({
                key: this.publicKey,
                secret: this.privateKey
            });
            const result = await coinPaymentsAPI.balances();
            return 0;
        }
        else if (network.type == NetworkType.RIPPLE) {
            if (!networkObject.contractAddress) {

                const adminAddress = network.siteWallet.publicKey;
                const balance = nodeHelper.getRippleBalance(adminAddress);
                return Response.success({ balance, address: adminAddress });
            } else {
                return Response.warn('Currently, do not support currency');
            }
        }
        else if (network.type == NetworkType.TRC20) {
            if (!networkObject.contractAddress) {
                const adminAddress = network.siteWallet.publicKey;
                const { decimalPoint } = currency.networks[0];
                const balance = nodeHelper.getTrc20Balance(adminAddress, decimalPoint);
                return Response.success({ balance, address: adminAddress });
            }
            else {
                const adminAddress = network.siteWallet.publicKey;
                const { contractAddress, decimalPoint } = currency.networks[0];
                const tokenBal = nodeHelper.getTrc20TokenBalance(contractAddress, adminAddress, decimalPoint);
                return Response.success({ balance: tokenBal, address: adminAddress });
            }
        }
        else if (web3NetworkType) {
            if (!networkObject.contractAddress) {
                const adminAddress = network.siteWallet.publicKey;
                const getBalance = nodeHelper.getWeb3Balance(web3NetworkType, adminAddress);
                return Response.success({ balance: getBalance, address: adminAddress });
            }
            else {
                const adminAddress = network.siteWallet.publicKey;
                const { contractAddress, decimalPoint } = currency.networks[0];
                const getBalance = nodeHelper.getWeb3TokenBalance(web3NetworkType, contractAddress, adminAddress, decimalPoint);
                return Response.success({ balance: getBalance, address: adminAddress });
            }
        }
        else {
            return Response.warn('Invalid request');
        }

    }
}

module.exports = WalletAddressService;