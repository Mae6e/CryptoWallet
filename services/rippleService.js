//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const AdminTransferRepository = require('../repositories/adminTransferRepository');

//? utils
const { SourceUserId, XrpFeeLimit } = require('../utils');
const { DepositState, CryptoType, PaymentType } = require('../utils/constants');
const { decryptRippleText } = require('../utils/cryptoEngine');

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
    updateRippleWalletBalances = async (depositParams) => {
        const { currency, networkType, recipientTransactions,
            initialBlockIndex, endBlockIndex, hasUpdatedBlockIndex } = depositParams;
        try {
            //? currency info
            const { network, adminWallet, decimalPoint } =
                currency.networks.find(x => x.network.type === networkType);
            if (!network || !currency.symbol || !decimalPoint || !adminWallet) {
                logger.error(`updateRippleWalletBalances|invalid data`, { currency, networkType, decimalPoint, adminWallet });
                return;
            }

            if (!network.generalWallet) {
                logger.error(`updateRippleWalletBalances|not found general wallet`, { networkType, decimalPoint });
                return;
            }

            const userAddress = network.generalWallet.publicKey;
            logger.debug(`updateRippleWalletBalances|start`, { initialBlockIndex, endBlockIndex, length: recipientTransactions.length });

            if (!recipientTransactions && typeof (recipientTransactions) === 'number') return;
            else if (recipientTransactions.length === 0) {
                logger.info(`updateRippleWalletBalances|findData`, { initialBlockIndex, endBlockIndex });
            }
            else {
                logger.debug(`updateRippleWalletBalances|success`, { initialBlockIndex, endBlockIndex });
                for (const transaction of recipientTransactions) {
                    await this.processRippleTransaction({
                        transaction, symbol: currency.symbol,
                        decimalPoint, userAddress, networkType,
                        networkId: network._id
                    });
                }
            }

            //? update the block and date of executed
            if (hasUpdatedBlockIndex) {
                await NetworkRepository.updateLastStatusOfNetwork(network, endBlockIndex);
                logger.info(`updateRippleWalletBalances|changeBlockState`, { endBlockIndex });
            }

            //? transfer balance of wallet
            await this.rippleExternalTransfer({
                currency: currency.symbol, adminWallet,
                generalWallet: network.generalWallet
            });

        } catch (error) {
            logger.error(`updateRippleWalletBalances|exception`, { currency }, error.stack);
        }
    }

    //? check transactions for users and admin
    processRippleTransaction = async (data) => {
        const { transaction, symbol, decimalPoint, userAddress, networkType, networkId } = data;
        let { Destination, DestinationTag,
            Amount, hash, date, ledger_index } = transaction;

        logger.debug(`processRippleTransaction|get transaction`, { transaction });
        if (!DestinationTag || DestinationTag === "" || userAddress !== Destination || !Amount) {
            return;
        }

        DestinationTag = DestinationTag.toString();
        logger.debug(`processRippleTransaction|waiting for deposit.`, { transaction });

        const amount = parseFloat(Amount) / Math.pow(10, decimalPoint);
        const userAddressDocument = await UserAddressRepository.getUserAddressByTag(networkId, DestinationTag);
        if (userAddressDocument) {
            const data = {
                txid: hash,
                user_id: userAddressDocument.user_id,
                currency: symbol,
                amount,
                payment_type: PaymentType[networkType],
                status: DepositState.COMPLETED,
                currency_type: CryptoType.CRYPTO,
                exeTime: new Date(date * 1000),
                block: ledger_index,
                address_info: Destination,
                tag: DestinationTag
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

    rippleExternalTransfer = async (data) => {
        try {

            const { currency, adminWallet, generalWallet } = data;
            logger.debug(`rippleExternalTransfer|start`, adminWallet);

            const { publicKey, memo } = adminWallet;
            if (!currency || !publicKey || !memo || !generalWallet) {
                logger.error(`rippleExternalTransfer|invalid data`, { currency, adminWallet });
                return;
            }

            const userAddress = generalWallet.publicKey;
            const userPrivateKey = decryptRippleText(generalWallet.privateKey);
            const mainWalletBalance = await nodeHelper.getRippleBalance(userAddress);

            //? the xrp account block 20 ripple
            let amount = mainWalletBalance - XrpFeeLimit;

            if (amount < XrpFeeLimit) {
                logger.warn(`rippleExternalTransfer|balance is not enough for the transfer`, { mainWalletBalance });
                return;
            }

            logger.info(`rippleExternalTransfer|get mainWalletBalance`, { userAddress, publicKey, mainWalletBalance, amount, memo });

            amount = amount.toFixed(4);
            const signedTransaction = await nodeHelper.signRippleTransaction(
                { userPrivateKey, publicKey, amount, memo });

            logger.info(`rippleExternalTransfer|signed Transaction`, { publicKey, amount, memo, signedTransaction });

            if (!signedTransaction || !signedTransaction.result) {
                logger.error(`rippleExternalTransfer|empty signedTransaction`, { publicKey, amount, memo, signedTransaction });
                return;
            }

            const { hash, meta } = signedTransaction.result;

            if (meta.TransactionResult !== "tesSUCCESS") {
                logger.error(`rippleExternalTransfer|fail signedTransaction`, { publicKey, amount, memo, signedTransaction });
                return;
            }

            const transData = {
                user_id: SourceUserId,
                currency,
                address: publicKey,
                amount: parseFloat(amount),
                transaction: hash
            };

            await AdminTransferRepository.create(transData);

            logger.info(`rippleExternalTransfer|complete transfer`, { transData });

        } catch (error) {
            logger.error(`rippleExternalTransfer|exception`, null, error.stack);
        }
    }

    //#endregion transfer
}

module.exports = RippleService;