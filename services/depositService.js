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

        let { symbol, networkType, initialBlockIndex, endBlockIndex,
            recipientTransactions, adminTransactions, hasUpdatedBlockIndex } = data;
        if (!symbol || !networkType || !initialBlockIndex) {
            console.log('Please Enter Network and Currency Information');
            return;
        }

        const network = await NetworkRepository.getNetworkByType(networkType);
        if (!network) {
            console.log('Invalid Network');
            return;
        }

        const currency = await CurrenciesRepository.getCurrencyBySymbol(symbol, network._id);
        if (!currency || !currency.networks[0]) {
            console.log('Invalid Currency');
            return;
        }

        let web3NetworkType;
        if (networkType)
            web3NetworkType = web3Helper.getWeb3Network(networkType);

        if (!endBlockIndex && !web3NetworkType) {
            console.log('Can not recognize endBlockNumber');
            return;
        }

        const depositParams = {
            currency, networkType: network.type,
            initialBlockIndex, endBlockIndex,
            recipientTransactions, adminTransactions,
            hasUpdatedBlockIndex
        };

        //? check for deposit by network 
        if (network.type == NetworkType.RIPPLE) {
            const rippleService = new RippleService();
            await rippleService.updateRippleWalletBalances(depositParams);
            return;
        }
        else if (network.type == NetworkType.TRC20) {
            const trc20Service = new Trc20Service();
            await trc20Service.updateTrc20WalletBalances(depositParams);
        }
        else if (web3NetworkType) {
            const web3Service = new Web3Service();
            await web3Service.updateWeb3WalletBalances(depositParams);
        }
        else {
            console.log('Can not deposit for this network');
            return;
        }

    }
}

module.exports = DepositService;