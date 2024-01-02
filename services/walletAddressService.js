const CoinPayments = require('coinpayments');
const path = require('path');

const { execSync } = require('child_process');

const { PublicPath } = require('../index');
const { NetworkSymbol } = require('../utils');
const Response = require('../utils/response');

const { encryptText, encryptRippleText, decryptRippleText } = require('../utils/cryptoEngine');
const rippleValidation = require('../public/ripple/ripple_check_address');

const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

const RippleService = require('../services/rippleService');
const rippleService = new RippleService();

//? repositories
const UserAddressRepository = require('../repositories/userAddressRepository');
const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');

//? utils
const {
    CoinPaymentPrivateKey,
    CoinPaymentPublicKey,
    CoinpaymentCurrencies
} = require('../utils');

const { NetworkType } = require('../utils/constants');

const { randomString } = require('../utils/walletHelper');


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

        //! btc, doge
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
        //! ripple
        else if (networkType == NetworkType.RIPPLE) {
            //? Ripple network
            const { generalWallet } = await NetworkRepository.getGeneralWalletByType(NetworkType.RIPPLE);
            if (!generalWallet) {
                return Response.warn('Currently, the wallet not found');
            }
            const tag = await this.generateXRPTag(8);
            return Response.success({ address: generalWallet.publicKey, tag });
        }
        //! trc20
        else if (networkType == NetworkType.TRC20) {
            const response = await nodeHelper.generateTrc20Wallet();
            console.log(response);
            if (response && response.address) {
                const key = encryptText(response.privateKey);
                const address = response.address.base58;
                const tag = response.address.hex;
                const publicKey = response.publicKey;
                if (!key || !address || !tag || !publicKey) {
                    return Response.warn('Currently, Can not generate address');
                }
                return Response.success({ address, tag, secret: key, public: publicKey });
            }
            return Response.warn('Currently, Can not get address');
        }
        //!web3
        else if (web3NetworkType) {
            const response = await nodeHelper.generateWeb3Wallet(web3NetworkType);
            console.log(response);
            if (response && response.address) {
                const address = response.address.toLowerCase();
                const key = encryptText(response.privateKey);
                if (!key) {
                    return Response.warn('Currently, Can not generate address');
                }
                return Response.success({ address, tag: randomString(25), secret: key });
            }
            return Response.warn('Currently, Can not get address');
        }

        else {
            return Response.warn('Currently, can not get address from this network');
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
            if (!network.generalWallet)
                return Response.warn('Currently, can not find wallet');

            const adminAddress = network.generalWallet.publicKey;
            const balance = await nodeHelper.getRippleBalance(adminAddress);
            return Response.success({ balance, address: adminAddress });
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

    };

    //? get general wallet
    getGeneralWalletAddress = async (networkType) => {
        const network = await NetworkRepository.getGeneralWalletByType(networkType);
        if (!network || !network.generalWallet) {
            return Response.warn('Can not find wallet');
        }
        return Response.success({ address: network.generalWallet.publicKey });
    }

    //! use in execute command
    //? generate ripple wallet and transfer
    static generateRippleWallet = async () => {
        try {

            const networkType = NetworkType.RIPPLE;

            //! check deposit and transfer
            const network = await NetworkRepository.getNetworkByType(networkType);
            if (!network) {
                console.log('Invalid Network');
            }

            const currency = await CurrenciesRepository.getCurrencyBySymbol(NetworkSymbol.XRP, network._id);
            if (!currency || !currency.networks[0]) {
                console.log('Invalid Currency');
            }

            const { generalWallet } = network;
            const { adminWallet } = currency.networks.find(x => x.network.type === networkType);
            if (!generalWallet || !generalWallet.publicKey) {
                console.log('Can not find source wallet!')
            }
            if (!adminWallet || !adminWallet.publicKey) {
                console.log('Can not find destination wallet!')
            }

            console.log('');
            console.log('Please wait for checking pervious deposits...');
            console.log(`Transferring from ${generalWallet.publicKey} to ${adminWallet.publicKey} wallet...`);
            console.log('');

            //? transfer
            await rippleService.updateRippleWalletBalances(currency, network.type);

            //? generate ripple address
            const generationData = await nodeHelper.rippleGenerateAddress();
            if (!generationData) {
                console.log('error occurred for generate address.please check log.');
                return;
            }

            const { secret, address } = generationData;
            const ecrypyPrivateKey = encryptRippleText(secret);

            if (!ecrypyPrivateKey || !address) {
                console.log('The generation keys failed!');
                return;
            }

            const response = await NetworkRepository.updateGeneralWallet(
                { type: networkType, publicKey: address, privateKey: ecrypyPrivateKey });
            if (!response) {
                console.log('Wallet update failed.check the type of network in db.');
                return;
            }

            console.log('Wallet update successful.please save PivateKey in the safe way!');
            console.log(`PivateKey: ${secret}`);
            console.log(`PublicKey: ${address}`);

        } catch (error) {
            console.log('Exception occurred:');
            console.log(error.message);
        }
    }

    //! use in execute command
    //? update ripple wallet 
    static updateRippleWallet = async ({ privateKey, publicKey }) => {
        try {
            if (!privateKey || !publicKey) {
                console.log('Please enter input data!');
                return;
            }
            if (!rippleValidation.isValidSeed(privateKey) ||
                !rippleValidation.isValidAddress(publicKey)) {
                console.log('Invalid input data!');
                return;
            }
            const ecrypyPrivateKey = encryptRippleText(privateKey);
            const response = await NetworkRepository.updateGeneralWallet(
                { type: NetworkType.RIPPLE, publicKey, privateKey: ecrypyPrivateKey });
            if (!response) {
                console.log('Wallet update failed.check the type of network in db.');
                return;
            }
            console.log('Wallet update successful.');
        } catch (error) {
            console.log('Exception occurred:');
            console.log(error.message);
        }
    }
}

module.exports = WalletAddressService;