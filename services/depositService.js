
//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');

//? utils
const Response = require('../utils/response');
const { NetworkType } = require('../utils/constants');

//? helper
const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

//? services
const Web3Service = require('./web3Service');
const RippleService = require('./rippleService');
const Trc20Service = require('./trc20Service');

class DepositService {

    //? main function for recognize network for deposit
    updateWalletBalance = async (data) => {

        let { symbol, networkType } = data;
        if (!symbol || !networkType) {
            return Response.warn('Please Enter Network and Currency Information');
        }

        const network = await NetworkRepository.getNetworkByType(networkType);
        if (!network) {
            return Response.warn('Invalid Network');
        }

        const currency = await CurrenciesRepository.getCurrencyBySymbol(symbol, network._id);
        if (!currency || !currency.networks[0]) {
            return Response.warn('Invalid Currency');
        }
        let web3NetworkType;
        if (networkType)
            web3NetworkType = web3Helper.getWeb3Network(networkType);

        //? check for deposit by network 
        if (network.type == NetworkType.RIPPLE) {
            const rippleService = new RippleService();
            rippleService.updateRippleWalletBalances(currency);
        }
        else if (network.type == NetworkType.TRC20) {
            const trc20Service = new Trc20Service();
            trc20Service.updateTrc20WalletBalances(currency);
        }
        else if (web3NetworkType) {
            const web3Service = new Web3Service();
            web3Service.updateWeb3WalletBalances(currency, network.type);
        }
        else
            return Response.warn('Invalid request');
    }
}

module.exports = DepositService;