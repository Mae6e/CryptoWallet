
const axios = require('axios');

//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const UserWalletRepository = require('../repositories/userWalletRepository');
const DepositRepository = require('../repositories/depositRepository');
const WltDepositsRepository = require('../repositories/wltDepositsRepository');

//? utils
const { XRPAddress } = require('../utils');
const Response = require('../utils/response');
const { NetworkType, DepositState, CryptoType } = require('../utils/constants');

//? helper
const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const TronHelper = require('../utils/tronHelper');
const tronHelper = new TronHelper();

const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

//? logger
const logger = require('../logger')(module);



class DepositService {


    //? main function for recognize network for deposit
    updateWalletBalance = async (data) => {

        console.log(data)


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
        if (networkType) {
            console.log(networkType)

            web3NetworkType = web3Helper.getWeb3Network(networkType);
            console.log(web3NetworkType)
        }

        if (network.type == NetworkType.RIPPLE) {
            this.updateRippleWalletBalances(currency);
        }
        else if (network.type == NetworkType.TRC20) {
            this.updateTrc20WalletBalances(currency);
        }
        else if (web3NetworkType) {
            console.log("herer");
            this.updateBscWalletBalances(currency);
        }
        else {
            return Response.warn('Invalid request');
        }
    }

    //? Ripple-Deposit
    updateRippleWalletBalances = async (currency) => {
        try {
            //? currency info
            const id = currency._id;
            const lastblockNumber = currency.networks[0].network.lastblockNumber;
            const lastExecutedAt = currency.networks[0].network.lastExecutedAt;
            const network = currency.networks[0].network;
            const symbol = currency.symbol;

            let date;
            if (lastExecutedAt) {
                date = lastExecutedAt.toISOString();
            }

            const currentBlockDate = date || "2022-09-12T00:00:00Z";
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

                logger.debug(`updateRippleWalletBalances|transactions`, { currentBlockDate, transaction });

                const address = transaction.destination;
                if (!transaction.destination_tag || transaction.destination_tag === "") {
                    continue;
                }
                if (XRPAddress !== address) {
                    continue;
                }

                const amount = transaction.delivered_amount;
                const txid = transaction.tx_hash;
                const desTag = transaction.destination_tag.toString();
                const exeTime = transaction.executed_time;

                const userAddressDocument = await UserAddressRepository.getUserAddressByTag(symbol, XRPAddress, desTag);
                if (userAddressDocument) {
                    const data =
                    {
                        txid,
                        user_id: userAddressDocument.user_id,
                        currency: symbol,
                        amount,
                        payment_type: 'Ripple (XRP)',
                        status: DepositState.COMPLETED,
                        currency_type: CryptoType.CRYPTO,
                        exeTime
                    };
                    await this.updateUserWallet(data);
                }
                else {
                    const data = { txid, amount, currency: symbol };
                    await this.updateAdminWallet(data);
                }

                //? update the block and date of executed
                await NetworkRepository.updateLastStatusOfNetwork(network, lastblockNumber, exeTime);
                logger.info(`updateRippleWalletBalances|changeBlockState`, { network, currentBlockDate, exeTime });
            }
        }
        catch (error) {
            logger.error(`updateRippleWalletBalances|exception`, { currency }, error);
        }
    }

    //? Trc20-Deposit
    updateTrc20WalletBalances = async (currency) => {
        try {
            //? currency info
            const id = currency._id;
            let startBlockNumber = currency.networks[0].network.lastBlockNumber;
            const network = currency.networks[0].network._id;
            const symbol = currency.networks[0].network.symbol;
            const sitePublicKey = currency.networks[0].network.siteWallet.publicKey;
            const decimalPoint = currency.networks[0].decimalPoint;

            const sitePublicKeyHex = tronHelper.toHex(sitePublicKey).toUpperCase();

            logger.info(`updateTrc20WalletBalances|currency information`, currency);

            //? get all tokens in trc20 networks
            const tokens = await this.getAllTokensByNetwork(network);

            if (!startBlockNumber) startBlockNumber = 50000000;
            const endBlockNumber = startBlockNumber + 100;
            logger.debug(`updateTrc20WalletBalances|start`, { startBlockNumber, endBlockNumber });

            const result = await nodeHelper.getTrc20BlockTransactions(startBlockNumber, endBlockNumber);

            if (!result['block'] || result['block'].length === 0) {
                logger.error(`updateTrc20WalletBalances|deposit block has empty results`, { result, startBlockNumber, endBlockNumber });
                console.log(`Something went wrong ${JSON.stringify(result)}`);
                return;
            }

            const blocks = result['block'];
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

                        if (ins !== 1) {
                            continue;
                        }

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
                        const token = tokens.find(x => x.network.contract === contractAddress_Tx);
                        if (token) {
                            //? decode data for value and destination address
                            const data = transactionValue.data;
                            const txdata = data.substr(8);
                            let to = txdata.substr(0, 64).substring(22).toUpperCase();
                            to = "41" + to.substr(2);
                            const balData = parseInt(txdata.substr(64), 16);
                            const trxAmount = balData / Math.pow(10, token.network.decimalPoint);
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

            logger.error(`updateTrc20WalletBalances|data`, { recipientAddresses });


            if (recipientAddresses.length === 0) {
                logger.warn(`updateTrc20WalletBalances|dont exist recipient addresses`,
                    { recipientAddresses: recipientAddresses.length, startBlockNumber, endBlockNumber });
            }
            else {
                //? group by data with bluckNumber
                depositTransactions.sort((a, b) => a.block - b.block);

                const userAddressDocuments = await UserAddressRepository.getCoinAddressesByTagAndCurrency(symbol, recipientAddresses);
                if (userAddressDocuments.length === 0) {
                    logger.warn(`updateTrc20WalletBalances|not found userAddressDocuments`, { recipientAddresses: recipientAddresses.length });
                }
                else {
                    logger.debug("updateTrc20WalletBalances|deposits wallet DepositFounds check ...");
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

                            const data = {
                                txid,
                                user_id: userId,
                                currency: transaction.currency,
                                amount: trxAmount,
                                payment_type: 'Tron (TRX)',
                                status: DepositState.COMPLETED,
                                currency_type: CryptoType.CRYPTO,
                                address_info: account,
                                block
                            };
                            if (transaction.currency !== symbol) {
                                data.bin_txid = '';
                            }

                            const updateUserWalletResponse = await this.updateUserWallet(data);
                            logger.info("updateTrc20WalletBalances|check for new deposit trx", data);

                            if (updateUserWalletResponse) {
                                logger.info("updateTrc20WalletBalances|create new deposit trx", data);

                                //? update the block and date of executed
                                await NetworkRepository.updateLastStatusOfNetwork(network, block, new Date());
                                logger.info(`updateTrc20WalletBalances|changeBlockState`, { network, block });
                            }
                        }
                    }
                }
            }

            //? update the block and date of executed
            await NetworkRepository.updateLastStatusOfNetwork(network, blockNumber, new Date());
            logger.info(`updateTrc20WalletBalances|changeBlockState-general`, { network, blockNumber });
        }
        catch (error) {
            logger.error(`updateTrc20WalletBalances|exception`, { currency }, error);
        }
    }

    //? Bep20-Deposit
    updateBscWalletBalances = async (currency) => {
        try {
            //? currency info
            let startBlockNumber = currency.networks[0].network.lastBlockNumber;
            const symbol = currency.networks[0].network.symbol;
            const sitePublicKey = currency.networks[0].network.siteWallet.publicKey.toLowerCase();
            const decimalPoint = currency.networks[0].decimalPoint;
            const networkType = currency.networks[0].network.type;

            logger.info(`updateBscWalletBalances|currency information`, currency);

            if (!startBlockNumber) startBlockNumber = 10000;
            const endBlockNumber = startBlockNumber + 1;
            logger.debug(`updateBscWalletBalances|start`, { startBlockNumber, endBlockNumber });

            for (let i = startBlockNumber; i <= endBlockNumber; i++) {
                const transactions = await web3Helper.getTransactionsByBlockNumber(networkType, i);
                if (!transactions || transactions.length === 0) {
                    logger.error(`updateBscWalletBalances|deposit block has empty results`, { transactions, startBlockNumber, currentBlockNumber: i });
                    continue;
                }

                logger.debug(`updateBscWalletBalances|start checkTransactions of block`, { transactions: transactions.map(x => x.hash) });
                logger.info(`updateBscWalletBalances|get transactions of block`, { transactions: transactions.length });

                let adminTransactions = [];
                let recipientTransactions = [];

                console.log("the start of", new Date());

                for (const txObject of transactions) {
                    let { to, value, hash, from } = txObject;
                    to = to.toLowerCase();

                    if (value.toString() === '0') {
                        const response = await web3Helper.getContractTransactionsByHash(networkType, hash);
                        if (response.to === sitePublicKey) {
                            adminTransactions.push(response);
                        } else if (response.from !== sitePublicKey) {
                            recipientTransactions.push(response);
                        }
                    }
                    else if (to !== "") {
                        if (to === sitePublicKey) {
                            adminTransactions.push({ to, value, hash, from });
                        } else if (from !== sitePublicKey) {
                            recipientTransactions.push({ to, value, hash, from });
                        }
                    }
                }

                console.log("the end of", new Date());

                logger.info(`updateBscWalletBalances|get result of track transactions`,
                    {
                        currentBlockNumber: i,
                        recipientTransactions: recipientTransactions.length,
                        adminTransactions: adminTransactions.length
                    });

                logger.debug(`updateBscWalletBalances|get recipientTransactions`, { recipientTransactions });
                logger.debug(`updateBscWalletBalances|get adminTransactions`, { adminTransactions });

                const data = {
                    symbol,
                    blockNumber: i,
                    adminTransactions,
                    recipientTransactions,
                    networkType,
                    decimalPoint
                };
                // saveBscTransactions(data);
            }
        }
        catch (error) {
            logger.error(`updateBscWalletBalances|exception`, { currency }, error);
        }
    }

    //? Bep20-Deposit Save
    saveBscTransactions = async (data) => {

        const { symbol, blockNumber, adminTransactions, recipientTransactions, networkType, decimalPoint } = data;

        //? format tokens data and get hex value 
        const tokens = await this.getAllTokensByNetwork(networkType);

        if (recipientTransactions.length === 0) {
            Logger.debug(`No transactions of block ${block.block_number} related to xglober`);
        }
        else {
            const userAddressDocuments = await UserAddressRepository
                .getCoinAddressesByValueAndCurrency(symbol, recipientTransactions.map(x => x.to));
            if (userAddressDocuments.length === 0) {
                logger.warn(`updateTrc20WalletBalances|not found userAddressDocuments`, { recipientTransactions: recipientTransactions.length });
            }

            for (const userAddress of userAddressDocuments) {
                const userId = userAddress.user_id;
                if (!userId) {
                    //log
                    continue;
                }
                const currentAddresses = userAddress.address.filter(addr => addr.currency === symbol);
                if (currentAddresses.length === 0) {
                    continue;
                }

                Logger.debug("updateBnbBalance !empty address BNB ");
                const addressValue = currentAddresses[0].value.trim().toLowerCase();
                const transactions = recipientTransactions.filter(x => x.to === addressValue);

                for (const transaction of transactions) {

                    let { value, hash, contract } = transaction;
                    contract = contract.toLowerCase();

                    if (!contract) {
                        const amount = value / Math.pow(10, decimalpoint);
                        if (amount <= 0) {
                            continue;
                        }
                        const receiptResult = await web3Helper.getTransactionReceiptByHash(networkType, hash);
                        Logger.debug(`Check Bnb txid ${JSON.stringify(receipt)}`);

                        if (!receiptResult) {
                            //? can not find data
                            continue;
                        }
                        if (receiptResult.status !== 1) {
                            continue;
                        }

                        const data = {
                            txid: hash,
                            user_id: userId,
                            currency: symbol,
                            amount: parseFloat(amount),
                            payment_type: 'Binance Coin (BNB)',
                            status: DepositState.COMPLETED,
                            currency_type: CryptoType.CRYPTO,
                            address_info: addressValue,
                            block: blockNumber
                        };
                        logger.info("updateTrc20WalletBalances|check for new deposit trx", data);
                        const updateUserWalletResponse = await this.updateUserWallet(data);
                        logger.info("updateTrc20WalletBalances|create new deposit trx", data);

                    }
                    else {
                        const token = tokens.filter(x => x.network.contractAddress === contract);
                        if (!token) {
                            continue;
                        }
                        const amount = (value / token[0].decimalPoint).toFixed(8);
                        if (amount <= 0) {
                            continue;
                        }

                        const data = {
                            txid: hash,
                            user_id: userId,
                            currency: token.symbol,
                            amount: parseFloat(amount),
                            payment_type: 'BNB (BEP20)',
                            status: DepositState.COMPLETED,
                            currency_type: CryptoType.CRYPTO,
                            address_info: addressValue,
                            block: blockNumber
                        };
                        logger.info("updateTrc20WalletBalances|check for new deposit trx", data);
                        const updateUserWalletResponse = await this.updateUserWallet(data);
                        logger.info("updateTrc20WalletBalances|create new deposit trx", data);

                    }
                }
            }
        }

        if (adminTransactions.length > 0) {
            Logger.debug("updateBnbBalance Admins  ");
            for (const trans of adminTransactions) {
                const { value, hash, contract } = transaction;

                if (contract) {
                    const token = tokens.filter(x => x.network.contractAddress === contract);
                    const amount = value / token.network.decimalPoint;
                    const data = { txid: hash, amount, currency: token.symbol };
                    await this.updateAdminWallet(data);
                    Logger.debug("updateBnbBalance admin trans " + JSON.stringify(trans));

                } else {
                    const amount = value / decimalPoint;
                    const data = { txid: hash, amount, currency: symbol };
                    await this.updateAdminWallet(data);
                    Logger.debug("updateBnbBalance admin trans " + JSON.stringify(trans));
                }

            }
        }

        //? update the block and date of executed
        await NetworkRepository.updateLastStatusOfNetwork(networkType, blockNumber, new Date());
        logger.info(`updateTrc20WalletBalances|changeBlockState`, { networkType, blockNumber });

    }


    //! common functions

    //? add user Deposit, update userWallet 
    updateUserWallet = async (data) => {
        const { txid, user_id, currency, amount, payment_type, status, currency_type, exeTime, address_info, block } = data;
        const txnExists = await DepositRepository.checkExistsTxnId(txid, user_id, currency);
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
        if (userWallet) {
            const balance = userWallet[currency];
            const updateBal = balance + parseFloat(amount);
            await UserWalletRepository.updateUserWallet({ user: user_id, currency, amount: updateBal });
        }

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

        getContractAddress = (network) => {
            network === NetworkType.TRC20 ?
                tronHelper.toHex(obj.networks[0].contractAddress) :
                obj.networks[0].contractAddress
        }

        //? format tokens data and get hex value 
        let tokens = [];
        if (tokenDocuments.length > 0) {
            tokens = [...tokenDocuments].map(obj => ({
                type: obj.type,
                symbol: obj.symbol,
                network: {
                    decimalPoint: obj.networks[0].decimalPoint,
                    contract: getContractAddress(network)
                }
            }));
        }

        logger.debug(`updateTrc20WalletBalances|tokens information`, tokens);

        return tokens;
    }
}

module.exports = DepositService;