
const axios = require('axios');

//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const AdminTransferRepository = require('../repositories/adminTransferRepository');

//? utils
const { XRPAddress, XRPSecret, SourceUserId, NetworkSymbol } = require('../utils');
const { DepositState, CryptoType } = require('../utils/constants');

//? services
const UtilityService = require('./utilityService');
const utilityService = new UtilityService();

//? helpers
const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

//? logger
const logger = require('../logger')(module);

class RippleService {

    //#region deposit

    //? main function for recognize for deposit
    updateRippleWalletBalances = async (currency, networkType) => {
        try {
            //? currency info
            const { network, adminWallet, decimalPoint } = currency.networks.find(x => x.network.type === networkType);
            if (!network || !currency.symbol || !decimalPoint) {
                logger.warn(`updateRippleWalletBalances|invalid data`, { currency, networkType, decimalPoint });
                return;
            }

            const start = network.lastBlockNumber ? network.lastBlockNumber + 1 : -1;
            const end = start > 0 ? start + 1000 : 50000000;

            const response = await nodeHelper.getRippleLedgerTransactions({ account: XRPAddress, start, end });

            logger.debug(`updateRippleWalletBalances|start`, { start, end, length: response.length });

            if (!response && typeof (response) === 'number') return;
            else if (response.length === 0) {
                logger.warn(`updateRippleWalletBalances|findData`, { start, end, transactions: response.length });
            }
            else {
                logger.debug(`updateRippleWalletBalances|success`, { start, end });

                for (const transaction of response) {
                    await this.processRippleTransaction({ transaction, symbol: currency.symbol, decimalPoint });
                }
            }

            //? update the block and date of executed
            await NetworkRepository.updateLastStatusOfNetwork(network, end);
            logger.info(`processRippleTransaction|changeBlockState`, { network });

            //TODO transfer
            //this.rippleExternalTransfer(currency.symbol, adminWallet);

        } catch (error) {
            logger.error(`updateRippleWalletBalances|exception`, { currency }, error);
        }
    }

    //? check transactions for users and admin
    processRippleTransaction = async (data) => {
        const { transaction, symbol, decimalPoint } = data;
        const { Destination, DestinationTag,
            Amount, hash, date } = transaction;

        logger.debug(`processRippleTransaction|get transaction`, { transaction });
        if (!DestinationTag || DestinationTag === "" || XRPAddress !== Destination || !Amount) {
            return;
        }

        logger.debug(`processRippleTransaction|waiting for deposit.`, { transaction });

        const amount = parseFloat(Amount / Math.pow(10, decimalPoint));
        const userAddressDocument = await UserAddressRepository.getUserAddressByTag(symbol, XRPAddress, DestinationTag);
        if (userAddressDocument) {
            const data = {
                txid: hash,
                user_id: userAddressDocument.user_id,
                currency: symbol,
                amount,
                payment_type: 'Ripple (XRP)',
                status: DepositState.COMPLETED,
                currency_type: CryptoType.CRYPTO,
                exeTime: new Date(date * 1000)
            };

            const updateUserWalletResponse = await utilityService.updateUserWallet(data);
            logger.info("processRippleTransaction|check for new deposit ripple", data);
            if (updateUserWalletResponse) {
                logger.debug("processRippleTransaction|create new deposit ripple", data);
            }
            else {
                logger.warn(`processRippleTransaction|can not update user balance for ripple`, data);
            }
        } else {
            const data = { txid: hash, amount, currency: symbol };
            logger.info("processRippleTransaction|check for new admin-deposit ripple", data);
            await utilityService.updateAdminWallet(data);
        }
    }

    //#endregion deposit


    //#region transfer

    rippleExternalTransfer = async (currency, adminWallet) => {

        try {
            logger.debug(`rippleExternalTransfer|start`, { currency, adminWallet });

            const { publickKey, memo } = adminWallet;
            if (!currency || !publickKey || !memo) {
                logger.warn(`rippleExternalTransfer|invalid data (publickKey,memo)`, { currency, adminWallet });
            }

            //TODO why -15? rp8553VmXp23QjgpomG6sjAXkYNGkeRNxa
            const mainWalletBalance = nodeHeper.getRippleBalance(XRPAddress);
            let amount = mainWalletBalance - 15;

            if (amount <= 10) {
                logger.warn(`rippleExternalTransfer|balance is not enough for the transfer`, { mainWalletBalance });
            }

            logger.info(`rippleExternalTransfer|get mainWalletBalance`, { XRPAddress, mainWalletBalance });

            //TODO SecretKey
            //const secretKey = decrypText(details.secret) + decrypText(coin.password);
            amount = amount.toFixed(4);
            const signedTransaction = nodeHeper.signRippleTransaction(
                { XRPSecret, XRPAddress, publickKey, amount, memo });

            logger.info(`rippleExternalTransfer|signed Transaction`, { publickKey, amount, memo, signedTransaction });

            if (!signedTransaction[1]) {
                logger.warn(`rippleExternalTransfer|empty signedTransaction`, { publickKey, amount, memo, signedTransaction });
                return;
            }

            const data = signedTransaction[1].split('NaN');
            const result = JSON.parse(data[1]);
            if (result.resultCode !== "tesSUCCESS") {
                logger.warn(`rippleExternalTransfer|fail signedTransaction`, { publickKey, amount, memo, signedTransaction });
                return;
            }

            const transaction = signedTransaction[0].split('NaN');
            const txtObject = JSON.parse(transaction[1]);
            const transData = {
                user_id: SourceUserId,
                currency,
                address: publickKey,
                amount: parseFloat(amount),
                transaction: txtObject.txid
            };
            await AdminTransferRepository.create(transData);

            logger.info(`rippleExternalTransfer|complete transfer`, { transData });

        } catch (error) {
            logger.error(`rippleExternalTransfer|exception`, { currency, adminWallet }, error);
        }
    }

    //#endregion transfer

}

module.exports = RippleService;