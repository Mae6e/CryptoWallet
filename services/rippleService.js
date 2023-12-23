
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
            const { network, adminWallet } = currency.networks.find(x => x.network.type === networkType);
            if (!network || !currency.symbol) {
                logger.warn(`updateRippleWalletBalances|invalid data`, { currency, networkType });
                return;
            }

            const lastblockNumber = network.lastblockNumber;
            const lastExecutedAt = network.lastExecutedAt;
            const currentBlockDate = (lastExecutedAt ? lastExecutedAt.toISOString() : '2022-09-12T00:00:00Z');
            const url = `${process.env.EXPLORER_RIPPLE.replace('ADDRESS', XRPAddress)}${currentBlockDate}`;
            logger.debug(`updateRippleWalletBalances|start`, { currentBlockDate, url });

            const response = await axios.get(url);
            if (!response || !response.data) {
                return;
            }

            const { result, count, payments } = response.data;
            if (result !== 'success' || count === 0) {
                logger.error(`updateRippleWalletBalances|problem`, { currentBlockDate, result });
                return;
            }

            if (!payments || payments.length === 0) {
                logger.warn(`updateRippleWalletBalances|findData`, { currentBlockDate, payments: payments.length });
                return;
            }

            logger.debug(`updateRippleWalletBalances|success`, { currentBlockDate, count });

            for (const transaction of payments) {
                await this.processRippleTransaction({ transaction, symbol, network, lastblockNumber, currentBlockDate });
            }

            //TODO transfer
            this.rippleExternalTransfer(currency.symbol, adminWallet);

        } catch (error) {
            logger.error(`updateRippleWalletBalances|exception`, { currency }, error);
        }
    }

    //? check transactions for users and admin
    processRippleTransaction = async ({ transaction, symbol, network, lastblockNumber, currentBlockDate }) => {
        const { destination, destination_tag,
            delivered_amount, tx_hash, executed_time } = transaction;

        logger.debug(`processRippleTransaction|transactions`, { currentBlockDate, transaction });
        if (!destination_tag || destination_tag === "" || XRPAddress !== destination) {
            return;
        }

        const userAddressDocument = await UserAddressRepository.getUserAddressByTag(symbol, XRPAddress, destination_tag);
        if (userAddressDocument) {
            const data = {
                txid: tx_hash,
                user_id: userAddressDocument.user_id,
                currency: symbol,
                amount: delivered_amount,
                payment_type: 'Ripple (XRP)',
                status: DepositState.COMPLETED,
                currency_type: CryptoType.CRYPTO,
                exeTime: executed_time
            };
            await utilityService.updateUserWallet(data);
        } else {
            const data = { txid, amount, currency: symbol };
            await utilityService.updateAdminWallet(data);
        }

        //? update the block and date of executed
        await NetworkRepository.updateLastStatusOfNetwork(network, lastblockNumber, exeTime);
        logger.info(`processRippleTransaction|changeBlockState`, { network, executed_time });
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