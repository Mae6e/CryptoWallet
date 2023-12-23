
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

const { TrxStockAdminFeeLimit, TrxFeeLimit } = require('../utils/index');

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
    updateTrc20WalletBalances = async (currency, networkType) => {
        try {

            //? currency info
            const { network, adminWallet, decimalPoint } = currency.networks.find(x => x.network.type === networkType);
            if (!network || !currency || !decimalPoint) {
                logger.warn(`updateTrc20WalletBalances|invalid data`, { currency, networkType });
                return;
            }

            let startBlockNumber = network.lastBlockNumber;
            const type = network.type;
            const networkId = network._id;
            const symbol = network.symbol;
            const sitePublicKey = network.siteWallet.publicKey;

            const sitePublicKeyHex = tronHelper.toHex(sitePublicKey).toUpperCase();
            logger.info(`updateTrc20WalletBalances|currency information`, currency);

            if (!startBlockNumber) startBlockNumber = 50000000;
            const endBlockNumber = startBlockNumber + 100;
            logger.debug(`updateTrc20WalletBalances|start`, { startBlockNumber, endBlockNumber });
            const result = await nodeHelper.getTrc20BlockTransactions(startBlockNumber, endBlockNumber);
            if (!result['block'] || result['block'].length === 0) {
                logger.error(`updateTrc20WalletBalances|deposit block has empty results`, { result, startBlockNumber, endBlockNumber });
                console.log(`Something went wrong ${JSON.stringify(result)}`);
                return;
            }

            //? get all tokens in trc20 networks
            const tokens = await utilityService.getAllTokensByNetwork(networkId);

            const { recipientAddresses, depositTransactions } =
                await this.processTransactions({ symbol, tokens, blocks: result['block'], sitePublicKeyHex, decimalPoint });

            if (recipientAddresses.length === 0) {
                logger.warn(`updateTrc20WalletBalances|dont exist recipient addresses`,
                    { recipientAddresses: recipientAddresses.length, startBlockNumber, endBlockNumber });
            }
            else {
                //? sort data with bluckNumber
                depositTransactions.sort((a, b) => a.block - b.block);
                await this.saveTrc20Transactions({ networkId, symbol, type, recipientAddresses, depositTransactions });
            }

            //? update the block and date of executed
            await NetworkRepository.updateLastStatusOfNetwork(networkId, endBlockNumber, new Date());
            logger.info(`updateTrc20WalletBalances|changeBlockState-general`, { networkId, endBlockNumber });
        }
        catch (error) {
            logger.error(`updateTrc20WalletBalances|exception`, { currency }, error);
        }
    }

    //? track transactions in blocks
    processTransactions = async ({ symbol, blocks, sitePublicKeyHex, decimalPoint, tokens }) => {

        let recipientAddresses = [];
        let depositTransactions = [];
        let blockNumber;

        //? find blocks
        for (const block of blocks) {
            if (!block['block_header'] || !block['transactions']) {
                continue;
            }
            blockNumber = block['block_header']['raw_data']['number'];
            const transactions = block['transactions'];

            for (const transaction of transactions) {
                if (!transaction['ret'] || !transaction['raw_data'] || !transaction['txID']) {
                    continue;
                }

                const status = transaction['ret'][0]['contractRet'];
                const txid = transaction['txID'];

                if (status !== 'SUCCESS') {
                    continue;
                }

                const transactionValue = transaction['raw_data']['contract'][0]['parameter']['value'];
                //? trx in trc20 network-deposit
                if (transactionValue['amount'] && !transactionValue['asset_name']) {
                    let ins = 1;
                    if (transactionValue['owner_address']) {
                        const ownerAddress = transactionValue['owner_address'].toUpperCase();
                        if (ownerAddress === sitePublicKeyHex) {
                            ins = 0;
                        }
                    }

                    if (ins !== 1) continue;

                    const tronAmount = transactionValue['amount'] / Math.pow(10, decimalPoint);
                    const amount = tronAmount.toFixed(8);
                    if (amount <= 0.001) {
                        continue;
                    }
                    const to = transactionValue['to_address'].toUpperCase();
                    const transactionAddress = { key: to, currency: symbol, txid, amount, block: blockNumber };
                    //? added trx to array    
                    depositTransactions.push(transactionAddress);
                    if (!recipientAddresses.includes(to)) {
                        recipientAddresses.push(to);
                    }
                }

                //? trc20 token-deposit
                else if (transactionValue['data'] && transactionValue['contract_address']) {
                    const contractAddress_Tx = transactionValue['contract_address'];
                    const token = tokens.find(x => x.contract === contractAddress_Tx);
                    if (token) {
                        //? decode data for value and destination address
                        const data = transactionValue.data;
                        const txdata = data.substr(8);
                        let to = txdata.substr(0, 64).substring(22).toUpperCase();
                        to = "41" + to.substr(2);
                        const balData = parseInt(txdata.substr(64), 16);
                        const trxAmount = balData / Math.pow(10, token.decimalPoint);
                        const amount = parseFloat(trxAmount.toFixed(8));
                        const transactionAddress = { key: to, currency: token.symbol, txid, amount, block: blockNumber };

                        //? added trx to array    
                        depositTransactions.push(transactionAddress);
                        if (!recipientAddresses.includes(to)) {
                            recipientAddresses.push(to);
                        }
                    }
                }
            }
        }

        logger.debug(`processTransactions|get recipientAddresses`, { recipientAddresses: recipientAddresses.length });
        return ({ recipientAddresses, depositTransactions });
    }

    //? save deposit transactions  in db
    saveTrc20Transactions = async ({ networkId, symbol, type, recipientAddresses, depositTransactions }) => {
        const userAddressDocuments = await UserAddressRepository.getCoinAddressesByTagAndCurrency(symbol, recipientAddresses);
        if (userAddressDocuments.length === 0) {
            logger.info(`saveTrc20Transactions|not found userAddressDocuments`, { recipientAddresses: recipientAddresses.length });
        }
        else {
            logger.debug("saveTrc20Transactions|deposits wallet DepositFounds check ...");
            for (const userAddress of userAddressDocuments) {
                const userId = userAddress.user_id;
                const trxAddress = userAddress.address.filter(item => item.currency === symbol);
                if (trxAddress.length === 0) {
                    continue;
                }
                const addressValue = Object.values(trxAddress)[0];
                const account = addressValue.value.trim();
                const tag = addressValue.tag.trim();
                const transactions = depositTransactions.filter(x => x.key === tag);
                for (const transaction of transactions) {
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
                        amount: trxAmount,
                        payment_type: PaymentType[type],
                        status: DepositState.COMPLETED,
                        currency_type: CryptoType.CRYPTO,
                        address_info: account,
                        block
                    };
                    if (transaction.currency !== symbol) {
                        data.bin_txid = '';
                        data.payment_type = TokenPaymentType[type]
                    }
                    const updateUserWalletResponse = await utilityService.updateUserWallet(data);
                    logger.info("saveTrc20Transactions|check for new deposit trx", data);
                    if (updateUserWalletResponse) {
                        logger.info("saveTrc20Transactions|create new deposit trx", data);
                        //? update the block and date of executed
                        await NetworkRepository.updateLastStatusOfNetwork(networkId, block, new Date());
                        logger.info(`saveTrc20Transactions|changeBlockState`, { networkId, block });
                    }
                    else {
                        logger.warn(`saveTrc20Transactions|can not update user balance for ${transaction.currency}`, data);
                    }
                }
            }
        }
    }

    //#endregion deposit

    //#region transferTRX

    //? transfer deposit trx documents to site wallet
    trc20ExternalTransfer = async (data) => {
        try {

            const { networkId, currency, decimalPoint, adminWallet, siteWallet } = data;
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

            if (notMovedDepositDocuments.length === 0) {
                return;
            }
            logger.info(`trc20ExternalTransfer|get all not_moved deposit document`, { currency, length: notMovedDepositDocuments.length });


            //? get all user's address in not_moved deposi document
            const userAddressDocuments = await utilityService.getCoinAddressesByUsers(
                { currency, users: notMovedDepositDocuments.map(x => x.user_id) });
            logger.debug(`trc20ExternalTransfer|get all user's document`, { currency, length: userAddressDocuments.length });

            for (const userAddress of userAddressDocuments) {

                const { address, user_id } = userAddress.find(x => x.currency === currency);

                //? get user secret key
                const userPrivateKey = decryptText(address.secret);
                const userPublicKey = address.value;
                if (!userPrivateKey) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|dont exist secret`, { currency, userPublicKey });
                    continue;
                }

                //? check token fee
                const isExistTokenFee = await TokenFeeRepository.existsActiveTokenFeesByNetwork(
                    {
                        network: networkId, user_id
                    }
                );
                logger.info(`trc20ExternalTransfer|check exist token fee document`, { currency, userPublicKey, isExistTokenFee });

                if (isExistTokenFee) {
                    //TODO SEND SMS
                    logger.warn(`trc20ExternalTransfer|exist token fee document`, { currency, userPublicKey, isExistTokenFee });
                    continue;
                }

                //? get balance of user address
                let transferAmount = nodeHelper.getTrc20Balance(userPublicKey, 0);
                if (!transferAmount) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|the online value of transferAmount is zero`, { currency, userPublicKey, transferAmount });
                    continue;
                }

                //? transfer amount 
                // const transferAmount = balance - balance % Math.pow(10, decimalPoint);
                if (transferAmount <= TrxFeeLimit) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|transferAmount less than TrxFeeLimit`, { currency, userPublicKey, transferAmount, TrxFeeLimit });
                    continue;
                }

                //? get sitewallet balance
                const siteWalletPublicKey = siteWallet.publicKey;
                const siteWalletBalance = nodeHelper.getTrc20Balance(siteWalletPublicKey, 0);

                let outputTransaction;
                let updateDepositMove = true;

                //? check siteWallet have 100 trx
                if (siteWalletBalance >= TrxStockAdminFeeLimit) {
                    //?transfer all transferAmount
                    logger.info(`trc20ExternalTransfer|siteWalletBalance greater than TrxStockAdminFeeLimit. move TRX to admin'`, { TrxStockAdminFeeLimit, siteWalletBalance });
                    //? sign transaction to network
                    outputTransaction = nodeHelper.signTrc20Transaction({ userPrivateKey, publicKey, transferAmount });
                    logger.info(`trc20ExternalTransfer|TRX move to addmin wallet`, { outputTransaction, adminPublicKey: publicKey, transferAmount, userPublicKey });
                }
                else {
                    //? transfer the part of transferAmount to site wallet
                    //? charge site wallet 
                    //TODO SEND SMS

                    let diffForceValue = TrxStockAdminFeeLimit - siteWalletBalance;
                    if (diffForceValue < TrxFeeLimit)
                        diffForceValue = TrxFeeLimit;

                    if (((transferAmount - diffForceValue) > (3 * TrxFeeLimit))) {
                        logger.info(`trc20ExternalTransfer|the diffForceValue can be transfer to admin wallet`, { transferAmount, userPublicKey, diffForceValue, TrxFeeLimit });
                        transferAmount = diffForceValue;
                        updateDepositMove = false;
                    }
                    //? sign transaction to network
                    outputTransaction = nodeHelper.signTrc20Transaction({ userPrivateKey, siteWalletPublicKey, transferAmount });
                    logger.info(`trc20ExternalTransfer|part of TRX move to admin wallet`, { outputTransaction, adminPublicKey: publicKey, transferAmount, userPublicKey, diffForceValue });
                }

                //? save transfer data to database
                if (outputTransaction && outputTransaction['result'] && outputTransaction['result'] === 1) {
                    const transactionHash = outputTransaction['txid'];
                    transferAmount = transferAmount / Math.pow(10, decimalPoint);
                    if (updateDepositMove) {
                        await UtiltyService.UpdateDepositsByStatus({ currency, userPublicKey });
                    }
                    await TokenFeeRepository.deactiveTokenFeesByNetwork({
                        network: networkId, currency, user_id
                    });
                    await AdminTransferRepository.Create({
                        userId: user_id, currency, account: userPublicKey,
                        balance: transferAmount, transaction: transactionHash
                    });
                    logger.info(`trc20ExternalTransfer|save transfer data to database`, { currency, transferAmount, userPublicKey, transactionHash });
                } else {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransfer|did not create success transaction`, { currency, transferAmount, userPublicKey, outputTransaction });
                }
            }

            logger.info(`trc20ExternalTransfer|complete transfer`, { currency, adminWallet });

        } catch (error) {
            //TODO SEND SMS
            logger.error(`trc20ExternalTransfer|exception`, { currency, adminWallet }, error);
        }
    }

    //#endregion transferTRX

    //#region transferTokens

    //? transfer deposit tokens documents to site wallet
    trc20ExternalTransferTokens = async (data) => {
        try {
            const { networkId, currencyId, symbol, currency, decimalPoint, networkDecimalPoint, contract, adminWallet, siteWallet } = data;
            logger.debug(`trc20ExternalTransferTokens|start`, { currency, adminWallet });

            const { publicKey } = adminWallet;
            if (!symbol || !networkId || !currencyId || !currency || !networkDecimalPoint || !publicKey || !decimalPoint || !siteWallet || !contract) {
                logger.warn(`trc20ExternalTransferTokens|invalid data`, { symbol, currency, adminWallet });
            }

            //? get all not_moved deposit tokens document
            const notMovedDepositDocuments = await utilityService.getAllDepositsByStatus(
                {
                    currency, move_status: DepositMoveStatus.NOT_MOVED,
                    payment_type: TokenPaymentType[NetworkType.TRC20]
                });

            if (notMovedDepositDocuments.length === 0) {
                return;
            }

            logger.info(`trc20ExternalTransferTokens|get all not_moved deposit document`, { currency, length: notMovedDepositDocuments.length });
            for (const document of notMovedDepositDocuments) {

                const { address, user_id } = document.find(x => x.currency === symbol);
                const userPublicKey = address.value;
                const userPrivateKey = decryptText(address.secret);

                const tokenBalance = await nodeHelper.getTrc20TokenBalance(contract, userPublicKey, decimalPoint);
                if (!tokenBalance) {
                    //TODO SEND SMS
                    logger.error(`trc20ExternalTransferTokens|the online value of tokenBalance is zero`, { currency, userPublicKey, tokenBalance });
                    continue;
                }

                const trxBalance = await nodeHelper.getTrc20Balance(userPublicKey, networkDecimalPoint);

                //? get contract transaction fee
                const tokenFeeAmount = this.getTrc20TokenFee(
                    { address: userPublicKey, to: publicKey, contractAddress: contract, amount: tokenBalance });

                if (trxBalance < tokenFeeAmount) {
                    //? check token fee
                    const isExistTokenFee = await TokenFeeRepository.existsActiveTokenFeesByCurrency({
                        network: networkId,
                        currency: currencyId,
                        user_id
                    });
                    logger.info(`trc20ExternalTransferTokens|check exist token fee document`, { currency, user_id, isExistTokenFee });

                    if (!isExistTokenFee) {
                        const adminPrivateKey = decryptText(siteWallet.secret);
                        logger.info(`trc20ExternalTransferTokens|moving TrxFee to account without TokenFee`, { currency, userPublicKey, tokenFeeAmount });
                        this.moveTrxFeeToAccount(
                            {
                                network: networkId, currency: currencyId,
                                adminPrivateKey, userPublicKey,
                                user_id, tokenFeeAmount
                            });
                    }
                    else {
                        const latestTokenFee = await TokenFeeRepository.getLatestTrxActiveFeeMove({ user_id, address: userPublicKey, currency, network });
                        //? TRX Fee moved again after 8 minutes for account
                        const updated_time = new Date(latestTokenFee.updated_at).getTime();
                        if (Date.now() - updated_time >= 8 * 60 * 1000) {
                            logger.info(`trc20ExternalTransferTokens|moving TrxFee to account- 8 min`, { currency, userPublicKey, tokenFeeAmount });
                            this.moveTrxFeeToAccount(
                                {
                                    network: networkId, currency: currencyId,
                                    adminPrivateKey, userPublicKey,
                                    user_id, tokenFeeAmount
                                });
                            logger.warn(`trc20ExternalTransferTokens|TRX Fee moved again after 8 minutes`, { currency, userPublicKey, user_id, tokenFeeAmount });
                        }
                    }
                } else {

                    logger.info(`trc20ExternalTransferTokens|signing token trx`, { currency, userPublicKey, user_id, trxBalance, tokenFeeAmount });

                    const outputTransaction = await nodeHelper.signTrc20TokenTransaction(
                        userPrivateKey, publicKey, contract, tokenBalance);

                    logger.info(`trc20ExternalTransferTokens|signed token trx`, { currency, userPublicKey, outputTransaction });

                    //? save transfer data to database
                    if (outputTransaction && outputTransaction['result'] && outputTransaction['result'] === 1) {

                        const transactionHash = outputTransaction['txid'];
                        //? complete status of deposit collection
                        await UtiltyService.UpdateDepositsToCompeleted({ currency, address_info: userPublicKey });
                        //? deactive token fee
                        await TokenFeeRepository.deactiveTokenFees({ network: networkId, currency, user_id });
                        //? create admin transfer
                        await AdminTransferRepository.Create({
                            userId: user_id, currency, account: userPublicKey,
                            balance: tokenBalance, transaction: transactionHash
                        });
                        logger.info(`trc20ExternalTransferTokens|save transfer data to database`, { currency, transferAmount, userPublicKey, transactionHash });

                        //TODO SEND SMS

                    } else {
                        //TODO SEND SMS
                        logger.warn(`trc20ExternalTransferTokens|fail sign transaction`, { currency, contract, publicKey, user_id, tokenBalance });
                        continue;
                    }
                }
            }

        }
        catch (error) {
            logger.error(`trc20ExternalTransferTokens|exception`, { currency: data.currency }, error);
        }
    }

    //#endregion transferTokens


    //#region checkAdminTransfersTokens

    //? find pending transactions and update status of them
    checkAdminTransfersTrc20Tokens = async (currency) => {
        try {

            //? get all pending transactions
            const transactions = await AdminTransferRepository.pendingTransactions(currency);
            let smsError = false;
            logger.info(`checkAdminTransfersTokens|start`, { currency, length: transactions.length });

            for (const transaction of transactions) {
                //? check online transaction by txId
                const response = await TronHelper.getTransactionById(transaction.txid);
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
                            await transaction.save();
                            break;
                        case AdminTransfer.STATUS_TXT_OUT_OF_ENERGY:
                            logger.error(`checkAdminTransfersTokens|out of energy`,
                                { currency, transaction: transaction.txid });
                            transaction.status = AdminTransferStatus.OUT_OF_ENERGY;
                            transaction.status_txt = AdminTransferTxtStatus.OUT_OF_ENERGY;
                            await transaction.save();
                            smsError = true;
                            //TODO send sms
                            break;
                    }
                }

                logger.warn(`checkAdminTransfersTokens|not found the ret of response`, { currency, response });

            }
        } catch (error) {
            //TODO send sms
            logger.error(`checkAdminTransfersTokens|exception`, currency, error);
        }
    }

    //#endregion checkAdminTransfersTokens

    //#region move tron to user account
    moveTrxFeeToAccount = async (data) => {
        const { network, currency, adminPrivateKey, userPublicKey, user_id, tokenFeeAmount } = data;
        const response = nodeHelper.signTrc20Transaction(adminPrivateKey, userPublicKey, tokenFeeAmount);

        if (!response['result'] || response['result'] !== 1) {
            logger.error(`moveTrxFeeToAccount|fail the result of signTrc20Transaction`, { data, response });
        }

        const txid = response['txid'];

        const model = {
            user_id,
            address: userPublicKey,
            currency,
            network,
            fees: tokenFeeAmount,
            status: TokenFeeStatus.ACTIVE,
            txid
        };

        await TokenFeeRepository.create(model);
        logger.info(`moveTrxFeeToAccount|create token fee document`, { model });
    }
    //#endregion move tron to user account


    //#region calculate tokenFee

    //? calculate the token's fee for create transaction
    calculateTokenFee = (data) => {
        try {
            const { address, to, contractAddress, amount } = data;
            if (!address || !to || !contractAddress || !amount) {
                logger.error(`calculateTokenFee-empty args for calculateTokenFee`, data, error);
                return -1;
            }

            //? trigger the contract to get the energy used
            const response = nodeHelper.trc20TriggerConstant(data);
            if (!response) return -2;
            const energyUsed = response.energy_used;
            if (!energyUsed) return -3;
            if (energyUsed <= 0) return -4;

            return Math.ceil(energyUsed / TokenFee.getEnergyPerTrxBurn());

        } catch (error) {
            logger.error(`calculateTokenFee-exception`, data, error);
            return -5;
        }
    }

    getTrc20TokenFee = (data) => {
        const { address, to, contractAddrss, amount } = data;
        let trxFee = TrxFeeLimit / 1000000;
        for (let i = 0; i < 3; i++) {
            logger.info(`getTrc20TokenFees item ${i} ${address} > ${to} >> ${contractAddrss} >>> ${amount}`);
            let calc = calculateTokenFee(data);
            if (calc > trxFee) {
                trxFee = calc;
                break;
            }
        }
        return trx + 2;
    }

    //#endregion calculate tokenFee
}

module.exports = Trc20Service;
