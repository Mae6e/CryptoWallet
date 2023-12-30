//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const AdminTransferRepository = require('../repositories/adminTransferRepository');

//? utils
const { SourceUserId } = require('../utils');
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
    updateRippleWalletBalances = async (currency, networkType) => {
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
            const lastOnlineBlockNumber = await nodeHelper.getLastLedgerIndex();

            if (!lastOnlineBlockNumber) return;
            if (Number(network.lastBlockNumber) === Number(lastOnlineBlockNumber)) return;

            const start = network.lastBlockNumber ? network.lastBlockNumber + 1 : -1;
            let end = start > 0 ? start + 1000 : 50000000;
            end = end < lastOnlineBlockNumber ? end : lastOnlineBlockNumber;

            const response = await nodeHelper.getRippleLedgerTransactions({ account: userAddress, start, end });

            logger.debug(`updateRippleWalletBalances|start`, { start, end, length: response.length });

            if (!response && typeof (response) === 'number') return;
            else if (response.length === 0) {
                logger.info(`updateRippleWalletBalances|findData`, { start, end, transactions: response.length });
            }
            else {
                logger.debug(`updateRippleWalletBalances|success`, { start, end });
                for (const transaction of response) {
                    await this.processRippleTransaction({
                        transaction, symbol: currency.symbol,
                        decimalPoint, userAddress, networkType
                    });
                }
            }

            //? update the block and date of executed
            await NetworkRepository.updateLastStatusOfNetwork(network, end);
            logger.info(`updateRippleWalletBalances|changeBlockState`, { end });

            //? transfer balance of wallet
            await this.rippleExternalTransfer({
                currency: currency.symbol, adminWallet,
                generalWallet: network.generalWallet
            });

        } catch (error) {
            logger.error(`updateRippleWalletBalances|exception`, { currency }, error);
        }
    }

    //? check transactions for users and admin
    processRippleTransaction = async (data) => {
        const { transaction, symbol, decimalPoint, userAddress, networkType } = data;
        let { Destination, DestinationTag,
            Amount, hash, date, ledger_index } = transaction;

        logger.debug(`processRippleTransaction|get transaction`, { transaction });
        if (!DestinationTag || DestinationTag === "" || userAddress !== Destination || !Amount) {
            return;
        }

        DestinationTag = DestinationTag.toString();
        logger.debug(`processRippleTransaction|waiting for deposit.`, { transaction });

        const amount = parseFloat(Amount) / Math.pow(10, decimalPoint);
        const userAddressDocument = await UserAddressRepository.getUserAddressByTag(symbol, DestinationTag);
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
            let amount = mainWalletBalance - 20;

            if (amount <= 10) {
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
            logger.error(`rippleExternalTransfer|exception`, null, error);
        }
    }

    //#endregion transfer
}

module.exports = RippleService;