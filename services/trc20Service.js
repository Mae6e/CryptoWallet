
//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const AdminTransferRepository = require('../repositories/adminTransferRepository');
const TokenFeeRepository = require('../repositories/tokenFeeRepository');

//? utils
const { DepositState, CryptoType, PaymentType, TokenPaymentType,
    DepositMoveStatus, NetworkType,
    AdminTransferStatus, AdminTransferTxtStatus,
    TokenFeeStatus } = require('../utils/constants');

const { TrxStockAdminFeeLimit, TrxFeeLimit, TrxCreateAccountFee } = require('../utils/index');

//? helper
const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const TronHelper = require('../utils/tronHelper');
const tronHelper = new TronHelper();

const { decryptText } = require('../utils/cryptoEngine');

//? services
const UtilityService = require('./utilityService');
const utilityService = new UtilityService();

//? logger
const logger = require('../logger')(module);


class Trc20Service {

    //#region deposit

    //? Trc20-Deposit
    updateTrc20WalletBalances = async (depositParams) => {
        const { currency, networkType, initialBlockIndex, endBlockIndex,
            hasUpdatedBlockIndex, recipientTransactions } = depositParams;
        try {
            //? currency info
            const { network, adminWallet, decimalPoint } = currency.networks.find(x => x.network.type === networkType);
            if (!network || !currency || !decimalPoint || !adminWallet || !network.siteWallet) {
                logger.warn(`updateTrc20WalletBalances|invalid data`, { networkType, decimalPoint, adminWallet });
                return;
            }

            const type = network.type;
            const networkId = network._id;
            const symbol = network.symbol;

            logger.debug(`updateTrc20WalletBalances|start`, { initialBlockIndex, endBlockIndex });

            //? get all tokens in trc20 networks
            const tokens = await utilityService.getAllTokensByNetwork(networkId);

            if (recipientTransactions.length === 0) {
                logger.warn(`updateTrc20WalletBalances|dont exist recipient addresses`,
                    { recipientTransactions: recipientTransactions.length, initialBlockIndex, endBlockIndex });
            }
            else {
                //? sort data with bluckNumber
                recipientTransactions.sort((a, b) => a.block - b.block);
                await this.saveTrc20Transactions({ networkId, symbol, decimalPoint, type, recipientTransactions, hasUpdatedBlockIndex, tokens });
            }

            //? update the block and date of executed
            if (hasUpdatedBlockIndex) {
                await NetworkRepository.updateLastStatusOfNetwork(networkId, endBlockIndex);
                logger.info(`updateTrc20WalletBalances|changeBlockState-general`, { networkId, endBlockIndex });
            }

            //! transfer
            //? token transfer
            for (const item of tokens) {
                await this.trc20ExternalTransferTokens({
                    networkId,
                    currencyId: item.currencyId,
                    symbol,
                    currency: item.symbol,
                    decimalPoint: item.decimalPoint,
                    networkDecimalPoint: decimalPoint,
                    contract: item.contract,
                    adminWallet: item.adminWallet,
                    siteWallet: network.siteWallet
                });
                //? check admin transfers
                await this.checkAdminTransfersTrc20Tokens(item.symbol);
            }

            //? token transfer
            await this.trc20ExternalTransfer({
                networkId, currency: symbol,
                decimalPoint, adminWallet,
                siteWallet: network.siteWallet
            });

        }
        catch (error) {
            logger.error(`updateTrc20WalletBalances|exception`, { initialBlockIndex, endBlockIndex, hasUpdatedBlockIndex }, error.stack);
        }
    }


    //? save deposit transactions  in db
    saveTrc20Transactions = async (data) => {
        const { networkId, symbol, decimalPoint, type, recipientTransactions, hasUpdatedBlockIndex, tokens } = data;
        const tags = [...new Set(recipientTransactions.map(x => x.key))];

        const userAddressDocuments = await UserAddressRepository.getUserAddressesByTags(networkId, tags);
        if (userAddressDocuments.length === 0) {
            logger.info(`saveTrc20Transactions|not found userAddressDocuments`, { recipientTransactions: recipientTransactions.length });
        }
        else {
            logger.debug("saveTrc20Transactions|deposits wallet DepositFounds check ...");
            for (const userAddress of userAddressDocuments) {
                const userId = userAddress.user_id;
                const trxAddress = userAddress.address.filter(item => item.network.equals(networkId));
                if (trxAddress.length === 0) {
                    continue;
                }
                const addressValue = Object.values(trxAddress)[0];
                const account = addressValue.value.trim();
                const tag = addressValue.tag.trim();
                const transactions = recipientTransactions.filter(x => x.key === tag);
                for (let transaction of transactions) {

                    if (!transaction.contract) {
                        const tronAmount = transaction.amount / Math.pow(10, decimalPoint);
                        transaction.amount = tronAmount.toFixed(8);
                        transaction.currency = symbol;
                        transaction.payment_type = PaymentType[type];
                    }
                    else {
                        const token = tokens.find(x => x.contractHex === transaction.contract);
                        if (!token) continue;

                        const trxAmount = transaction.amount / Math.pow(10, token.decimalPoint);
                        transaction.amount = parseFloat(trxAmount.toFixed(8));
                        transaction.currency = token.symbol;
                        transaction.bin_txid = '';
                        transaction.payment_type = TokenPaymentType[type]
                    }

                    const trxAmount = parseFloat(transaction.amount);
                    if (trxAmount <= 0.1) {
                        continue;
                    }
                    const block = transaction.block;
                    const txid = transaction.txid;
                    let data = {
                        txid,
                        user_id: userId,
                        currency: transaction.currency,
                        amount: transaction.amount,
                        payment_type: transaction.payment_type,
                        status: DepositState.COMPLETED,
                        currency_type: CryptoType.CRYPTO,
                        address_info: account,
                        block,
                        bin_txid: transaction.bin_txid
                    };

                    const updateUserWalletResponse = await utilityService.updateUserWallet(data);
                    logger.info("saveTrc20Transactions|check for new deposit trx", data);
                    if (!updateUserWalletResponse) {
                        logger.warn(`saveTrc20Transactions|can not update user balance for ${transaction.currency}`, data);
                    }

                    logger.info("saveTrc20Transactions|create new deposit trx", data);
                    if (hasUpdatedBlockIndex) {
                        //? update the block and date of executed
                        await NetworkRepository.updateLastStatusOfNetwork(networkId, block);
                        logger.info(`saveTrc20Transactions|changeBlockState`, { networkId, block });
                    }
                }
            }
        }
    }


    //#endregion deposit

    //#region transferTRX

    //? transfer deposit trx documents to site wallet
    trc20ExternalTransfer = async (data) => {
        const { networkId, currency, decimalPoint, adminWallet, siteWallet } = data;

        try {

            logger.debug(`trc20ExternalTransfer|start`, { currency, adminWallet });

            const { publicKey } = adminWallet;
            if (!networkId || !currency || !publicKey || !decimalPoint || !siteWallet) {
                logger.warn(`trc20ExternalTransfer|invalid data`, { currency, adminWallet });
            }

            //? get all not_moved deposit document
            const notMovedDepositDocuments = await utilityService.getAllDepositsByStatus(
                {
                    currency, move_status: DepositMoveStatus.NOT_MOVED,
                    payment_type: PaymentType[NetworkType.TRC20]
                });

            logger.info(`trc20ExternalTransfer|get all not_moved deposit document`, { currency, length: notMovedDepositDocuments.length });
            if (!notMovedDepositDocuments.length) {
                return;
            }

            //? get all user's address in not_moved deposi document
            const userAddressDocuments = await utilityService.getUserAddressesByUsers({
                network: networkId, users: notMovedDepositDocuments.map(x => x.user_id)
            });

            logger.debug(`trc20ExternalTransfer|get all user's document`, { currency, length: userAddressDocuments.length });

            for (const document of userAddressDocuments) {

                const { user_id, address } = document;
                const userAddress = address.find(x => x.network.equals(networkId));

                //? get user secret key
                const userPrivateKey = decryptText(userAddress.secret);
                const userPublicKey = userAddress.value;
                if (!userPrivateKey) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|dont exist secret`, { currency, userPublicKey });
                    continue;
                }

                //? check token fee
                const isExistTokenFee = await TokenFeeRepository.existsActiveTokenFeesByNetwork({
                    network: networkId, user_id
                });
                logger.info(`trc20ExternalTransfer|check exist token fee document`, { currency, userPublicKey, isExistTokenFee });

                if (isExistTokenFee) {
                    //TODO SEND SMS
                    logger.warn(`trc20ExternalTransfer|exist token fee document`, { currency, userPublicKey, isExistTokenFee });
                    continue;
                }

                //? get balance of user address
                let transferAmount = await nodeHelper.getTrc20Balance(userPublicKey, 0);
                if (!transferAmount) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|the online value of transferAmount is zero`, { currency, userPublicKey, transferAmount });
                    continue;
                }

                //? transfer amount 
                //transferAmount = transferAmount - transferAmount % Math.pow(10, decimalPoint);
                if (transferAmount <= TrxFeeLimit) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|transferAmount less than TrxFeeLimit`, { currency, userPublicKey, transferAmount, TrxFeeLimit });
                    continue;
                }

                //? get sitewallet balance
                const siteWalletPublicKey = siteWallet.publicKey;
                const siteWalletBalance = await nodeHelper.getTrc20Balance(siteWalletPublicKey, 0);

                let outputTransaction;
                let updateDepositMove = true;

                logger.info(`trc20ExternalTransfer|wallet balance`, {
                    siteWalletBalance, transferAmount,
                    siteWalletPublicKey, userPublicKey
                });

                //? check siteWallet have 100 trx
                if (siteWalletBalance >= TrxStockAdminFeeLimit - TrxCreateAccountFee) {
                    //?transfer all transferAmount
                    logger.info(`trc20ExternalTransfer|siteWalletBalance greater than TrxStockAdminFeeLimit. move TRX to admin'`, { TrxStockAdminFeeLimit, siteWalletBalance });
                    //? sign transaction to network
                    outputTransaction = await nodeHelper.signTrc20Transaction({ userPrivateKey, userPublicKey, publicKey, transferAmount });
                    logger.info(`trc20ExternalTransfer|TRX move to addmin wallet`, { outputTransaction, adminPublicKey: publicKey, transferAmount, userPublicKey });
                }
                else {
                    //? transfer the part of transferAmount to site wallet
                    //? charge site wallet 
                    let diffForceValue = TrxStockAdminFeeLimit - siteWalletBalance;
                    if (diffForceValue < TrxFeeLimit)
                        diffForceValue = TrxFeeLimit;

                    if (((transferAmount - diffForceValue) > (3 * TrxFeeLimit))) {
                        logger.info(`trc20ExternalTransfer|the diffForceValue can be transfer to admin wallet`, { transferAmount, userPublicKey, diffForceValue, TrxFeeLimit });
                        transferAmount = diffForceValue;
                        updateDepositMove = false;
                    }
                    //? sign transaction to network
                    outputTransaction = await nodeHelper.signTrc20Transaction({ userPrivateKey, userPublicKey, siteWalletPublicKey, transferAmount });
                    logger.info(`trc20ExternalTransfer|part of TRX move to admin wallet`, { outputTransaction, adminPublicKey: publicKey, transferAmount, userPublicKey, diffForceValue });
                }

                if (!outputTransaction || !outputTransaction.receipt || !outputTransaction.receipt.result) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|did not create success transaction`, { currency, transferAmount, userPublicKey, outputTransaction });
                    continue;
                }

                //? save transfer data to database
                const transactionHash = outputTransaction.receipt.txid;
                transferAmount = outputTransaction.amount / Math.pow(10, decimalPoint);
                if (updateDepositMove) {
                    await utilityService.UpdateDepositsByStatus({ currency, address_info: userPublicKey });
                }
                await TokenFeeRepository.deactiveTokenFeesByNetwork({
                    network: networkId, user_id
                });
                await AdminTransferRepository.create({
                    user_id, currency, address: userPublicKey,
                    amount: transferAmount, transaction: transactionHash
                });
                logger.info(`trc20ExternalTransfer|save transfer data to database`, { currency, transferAmount, userPublicKey, transactionHash });

            }

            logger.info(`trc20ExternalTransfer|complete transfer`, { currency, adminWallet });

        } catch (error) {
            //TODO SEND SMS
            logger.error(`trc20ExternalTransfer|exception`, { currency, adminWallet }, error.stack);
        }
    }

    //#endregion transferTRX

    //#region transferTokens

    //? transfer deposit tokens documents to site wallet
    trc20ExternalTransferTokens = async (data) => {
        try {
            const { networkId, currencyId, symbol, currency, decimalPoint,
                networkDecimalPoint, contract, adminWallet, siteWallet } = data;

            logger.debug(`trc20ExternalTransferTokens|start`, { currency, adminWallet });

            const { publicKey } = adminWallet;
            if (!symbol || !networkId || !currencyId || !currency || !networkDecimalPoint || !publicKey || !decimalPoint || !siteWallet || !contract) {
                logger.warn(`trc20ExternalTransferTokens|invalid data`, { symbol, currency, adminWallet });
            }

            //? get all not_moved deposit tokens document
            const notMovedDepositDocuments = await utilityService.getAllDepositsByStatus({
                currency, move_status: DepositMoveStatus.NOT_MOVED,
                payment_type: TokenPaymentType[NetworkType.TRC20]
            });

            logger.info(`trc20ExternalTransferTokens|get all not_moved deposit document`, { currency, length: notMovedDepositDocuments.length });

            if (!notMovedDepositDocuments.length) {
                return;
            }

            //? get all user's address in not_moved deposi document
            const userAddressDocuments = await utilityService.getUserAddressesByUsers({
                network: networkId, users: notMovedDepositDocuments.map(x => x.user_id)
            });
            logger.debug(`trc20ExternalTransferTokens|get all user's document`, { currency, length: userAddressDocuments.length });

            for (const document of userAddressDocuments) {

                const { user_id, address } = document;
                const userAddress = address.find(x => x.network.equals(networkId));

                const userPublicKey = userAddress.value;
                const userPrivateKey = decryptText(userAddress.secret);

                const tokenBalance = await nodeHelper.getTrc20TokenBalance(contract, userPublicKey, 0);
                if (!tokenBalance || tokenBalance === '0') {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransferTokens|the online value of tokenBalance is zero`, { currency, userPublicKey, tokenBalance });
                    continue;
                }

                const trxBalance = await nodeHelper.getTrc20Balance(userPublicKey, 0);

                //? get contract transaction fee
                const feeObject = { address: userPublicKey, to: publicKey, contractAddress: contract, amount: tokenBalance };
                const tokenFeeAmount = await nodeHelper.calculateTrc20TokenFee(feeObject);

                if (!tokenFeeAmount) {
                    logger.error(`trc20ExternalTransferTokens|fee value`, { tokenFeeAmount, feeObject });
                    continue;
                }

                if (trxBalance < tokenFeeAmount) {
                    //? check token fee
                    const isExistTokenFee = await TokenFeeRepository.existsActiveTokenFeesByCurrency({
                        network: networkId,
                        currency: currencyId,
                        user_id
                    });
                    logger.info(`trc20ExternalTransferTokens|check exist token fee document`, { currency, user_id, isExistTokenFee });

                    const siteWalletPrivateKey = decryptText(siteWallet.privateKey);
                    const siteWalletPublicKey = siteWallet.publicKey;

                    if (!isExistTokenFee) {
                        logger.info(`trc20ExternalTransferTokens|moving TrxFee to account without TokenFee`, { currency, userPublicKey, tokenFeeAmount });
                        await this.moveTrxFeeToAccount(
                            {
                                network: networkId, currency: currencyId,
                                siteWalletPrivateKey, userPublicKey,
                                siteWalletPublicKey,
                                user_id, tokenFeeAmount, networkDecimalPoint
                            });
                    }
                    else {

                        const latestTokenFee = await TokenFeeRepository.getLatestActiveFeeMove({
                            user_id, address: userPublicKey,
                            currency: currencyId, network: networkId
                        });
                        //? TRX Fee moved again after 8 minutes for account
                        const updated_time = new Date(latestTokenFee.updated_at).getTime();
                        if (Date.now() - updated_time >= 8 * 60 * 1000) {
                            logger.info(`trc20ExternalTransferTokens|moving TrxFee to account- 8 min`, { currency, userPublicKey, tokenFeeAmount });
                            await this.moveTrxFeeToAccount(
                                {
                                    network: networkId, currency: currencyId,
                                    siteWalletPrivateKey, userPublicKey,
                                    siteWalletPublicKey,
                                    user_id, tokenFeeAmount, networkDecimalPoint
                                });
                            logger.warn(`trc20ExternalTransferTokens|TRX Fee moved again after 8 minutes`, { currency, userPublicKey, user_id, tokenFeeAmount });
                        }
                    }
                } else {

                    logger.info(`trc20ExternalTransferTokens|signing token trx`, { currency, userPublicKey, user_id, trxBalance, tokenFeeAmount });

                    const outputTransaction = await nodeHelper.signTrc20TokenTransaction(
                        { userPrivateKey, publicKey, contract, tokenBalance });

                    logger.info(`trc20ExternalTransferTokens|signed token trx`, { currency, userPublicKey, outputTransaction });

                    if (!outputTransaction) {
                        //TODO SEND SMS
                        logger.error(`trc20ExternalTransferTokens|fail sign transaction`, { currency, contract, publicKey, user_id, tokenBalance });
                        continue;
                    }

                    //? save transfer data to database

                    //? complete status of deposit collection
                    await utilityService.UpdateDepositsToCompeleted({ currency, address_info: userPublicKey });
                    //? deactive token fee
                    await TokenFeeRepository.deactiveTokenFeesByCurrency({ network: networkId, currency: currencyId, user_id });
                    //? create admin transfer
                    await AdminTransferRepository.createKeeper({
                        user_id, currency, address: userPublicKey,
                        amount: tokenBalance / Math.pow(10, decimalPoint), transaction: outputTransaction
                    });
                    logger.info(`trc20ExternalTransferTokens|save transfer data to database`, { currency, tokenBalance, userPublicKey, outputTransaction });

                    //TODO SEND SMS
                }
            }
        }
        catch (error) {
            logger.error(`trc20ExternalTransferTokens|exception`, { currency: data.currency }, error.stack);
        }
    }

    //#endregion transferTokens


    //#region checkAdminTransfersTokens

    //? find pending transactions and update status of them
    checkAdminTransfersTrc20Tokens = async (currency) => {
        try {

            //? get all pending transactions
            const transactions = await AdminTransferRepository.pendingTransactions(currency);
            logger.info(`checkAdminTransfersTokens|start`, { currency, length: transactions.length });

            for (const transaction of transactions) {
                //? check online transaction by txId
                const response = await tronHelper.getTransactionById(transaction.txid);
                if (!response) {
                    logger.error(`checkAdminTransfersTokens|can not find transaction`,
                        { currency, transaction: transaction.txid });
                    continue;
                }

                logger.debug(`checkAdminTransfersTokens|tracking transaction`, { currency, transaction: transaction.txid });

                if (response.ret && response.ret.length > 0 && response.ret[0].contractRet) {
                    const state = response.ret[0].contractRet;

                    //? update transaction status
                    switch (state) {
                        case AdminTransferTxtStatus.SUCCESSS:
                            transaction.status = AdminTransferStatus.SUCCESSS;
                            transaction.status_txt = AdminTransferTxtStatus.SUCCESSS;
                            transaction.updated_at = new Date();
                            await transaction.save();
                            break;
                        case AdminTransfer.STATUS_TXT_OUT_OF_ENERGY:
                            logger.error(`checkAdminTransfersTokens|out of energy`,
                                { currency, transaction: transaction.txid });
                            transaction.status = AdminTransferStatus.OUT_OF_ENERGY;
                            transaction.status_txt = AdminTransferTxtStatus.OUT_OF_ENERGY;
                            transaction.updated_at = new Date();
                            await transaction.save();
                            //TODO send sms
                            break;
                    }
                } else {
                    logger.warn(`checkAdminTransfersTokens|not found the ret of response`, { currency, response });
                }
            }
        } catch (error) {
            //TODO send sms
            logger.error(`checkAdminTransfersTokens|exception`, currency, error.stack);
        }
    }

    //#endregion checkAdminTransfersTokens

    //#region move tron to user account
    moveTrxFeeToAccount = async (data) => {
        const { network, currency, siteWalletPrivateKey, siteWalletPublicKey, userPublicKey, user_id, tokenFeeAmount, networkDecimalPoint } = data;
        const response = await nodeHelper.signTrc20Transaction(
            { siteWalletPrivateKey, siteWalletPublicKey, userPublicKey, tokenFeeAmount }
        );

        if (!response || !response.receipt || !response.receipt.result) {
            //TODO SEND SMS
            logger.error(`moveTrxFeeToAccount|fail the result of signTrc20Transaction`, { currency, userPublicKey, tokenFeeAmount, response, amount: response.amount });
            return;
        }

        logger.info(`moveTrxFeeToAccount|success the result of signTrc20Transaction`, { currency, userPublicKey, response });

        const txid = response.receipt.txid;
        const fees = response.amount / Math.pow(10, networkDecimalPoint);

        const model = {
            user_id,
            address: userPublicKey,
            currency,
            network,
            fees,
            status: TokenFeeStatus.ACTIVE,
            txid
        };

        logger.info(`moveTrxFeeToAccount|creating token fee document`, model);

        await TokenFeeRepository.create(model);
        logger.info(`moveTrxFeeToAccount|end of func`, model);
    }
    //#endregion move tron to user account

}

module.exports = Trc20Service;
