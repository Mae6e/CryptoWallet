
//? repositories
const CurrenciesRepository = require('../repositories/currenciesRepository');
const UserWalletRepository = require('../repositories/userWalletRepository');
const DepositRepository = require('../repositories/depositRepository');
const WltDepositsRepository = require('../repositories/wltDepositsRepository');

//? utils
const { NetworkType } = require('../utils/constants');

const TronHelper = require('../utils/tronHelper');
const tronHelper = new TronHelper();

//? logger
const logger = require('../logger')(module);

class UtilityService {
    //? add user Deposit, update userWallet 
    updateUserWallet = async (data) => {
        const { txid, user_id, currency, amount, payment_type, status, currency_type, exeTime, address_info, block } = data;
        const txnExists = await DepositRepository.checkExistsTxnId(txid, user_id, currency, amount);
        if (txnExists) {
            return false;
        }

        //? add deposit document
        const depositData = {
            amount: parseFloat(amount),
            currency,
            payment_type,
            payment_method: `${currency} Payment`,
            reference_no: txid,
            status,
            user_id,
            move_status: 0,
            address_info,
            block,
            executedAt: exeTime,
            currency_type
        };
        await DepositRepository.create(depositData);

        //? update user wallet
        const userWallet = await UserWalletRepository.getUserBalance({ user: user_id, currency });
        const balance = userWallet[currency] || 0;
        const updateBal = parseFloat(balance + amount);
        await UserWalletRepository.updateUserWallet({ user: user_id, currency, amount: updateBal.toFixed(12) });


        //TODO SEND SMS
        return true;
    }

    //? add admin Deposit
    updateAdminWallet = async (data) => {
        const { txid, currency, amount } = data;
        const txnExists = await WltDepositsRepository.checkExistsTxnId(txid);
        if (txnExists) {
            return false;
        }

        const wltData = { txnid: txid, amount: parseFloat(amount), currency };
        await WltDepositsRepository.create(wltData);

        //TODO SEND SMS
        return true;
    }

    //? get all tokens by network
    getAllTokensByNetwork = async (network) => {
        const tokenDocuments = await CurrenciesRepository.getAllTokensByNetwork(network);

        const getContractAddress = (networkObject) => {
            return networkObject.network.type === NetworkType.TRC20
                ? tronHelper.toHex(networkObject.contractAddress)
                : networkObject.contractAddress;
        };

        //? format tokens data and get hex value 
        const tokens = tokenDocuments.map(obj => {
            const networkObj = obj.networks.find(x => x.network._id.equals(network));
            return {
                symbol: obj.symbol,
                type: networkObj.network.type,
                decimalPoint: networkObj.decimalPoint,
                contract: getContractAddress(networkObj)
            };
        });

        logger.debug('getAllTokensByNetwork|tokens information', tokens);

        console.log(tokens);

        return tokens;
    };

}


module.exports = UtilityService;