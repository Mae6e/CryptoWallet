const axios = require('axios');

const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const UserWalletRepository = require('../repositories/userWalletRepository');
const DepositRepository = require('../repositories/depositRepository');
const WltDepositsRepository = require('../repositories/wltDepositsRepository');

const Response = require('../utils/response');

//? utils
const { XRPAddress,
    NetworkSymbol } = require('../utils');

const { CurrencyType, NetworkType, DepositState, CryptoType } = require('../utils/constants');

const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const TronHelper = require('../utils/tronHelper');
const tronHelper = new TronHelper();

const logger = require('../logger')(module);

class DepositService {

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
        // if (networkType) {
        //     web3NetworkType = this.getWeb3Network(networkType);
        // }

        if (network.type == NetworkType.RIPPLE) {
            if (currency.type === CurrencyType.COIIN) {
                //! updateRippleWalletBalance
                this.updateRippleWalletBalances(currency);
            } else {
                //! noting
            }
        }
        else if (network.type == NetworkType.TRC20) {
            if (currency.type === CurrencyType.COIIN) {
                this.updateTrc20WalletBalances(currency);
            }
            else {

            }
        }
        else if (web3NetworkType) {
            if (currency.type === CurrencyType.COIIN) {

            }
            else {

            }
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
            const lastblockNumber = currency.networks[0].lastblockNumber;
            const lastExecutedAt = currency.networks[0].lastExecutedAt;
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

                const userAddressDocument = await UserAddressRepository.getUserByTag(symbol, XRPAddress, desTag);
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
                await CurrenciesRepository.updateLastStatusOfCurrency(id, network, lastblockNumber, exeTime);
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
            let startBlockNumber = currency.networks[0].lastBlockNumber;
            const network = currency.networks[0].network;
            const symbol = currency.symbol;
            const adminPublicKey = currency.networks[0].adminWallet.publicKey;
            const decimalPoint = currency.networks[0].decimalPoint;

            //? get all tokens in trc20 networks
            const tokenDocuments = await CurrenciesRepository.getAllTokensByNetwork(network);

            //? format tokens data and get hex value 
            let tokens = [];
            if (tokenDocuments.length > 0) {
                tokens = [...tokenDocuments].map(obj => ({
                    type: obj.type,
                    symbol: obj.symbol,
                    network: {
                        decimalPoint: obj.networks[0].decimalPoint,
                        contractAddressHex: tronHelper.toHex(obj.networks[0].contractAddress)
                    }
                }));
            }

            if (!startBlockNumber) startBlockNumber = 10000000;

            const endBlockNumber = startBlockNumber + 100;
            logger.debug(`Deposits updateTrxWalletsBalance updateTrx  start = ${startBlockNumber} end = ${endBlockNumber} `);

            const result = await nodeHelper.getTrc20BlockTransactions(startBlockNumber, endBlockNumber);

            if (!result['block'] || result['block'].length === 0) {
                logger.error(`Deposits block empty results update Tron 449 ${JSON.stringify(result)}`);
                console.log(`Something went wrong ${JSON.stringify(result)}`);
                return;
            }

            const blocks = result['block'];
            let recipientAddresses = [];
            let depositTransactions = [];

            //? find blocks
            for (const block of blocks) {

                if (!block['block_header'] || !block['transactions']) {
                    continue;
                }

                const blockNumber = block['block_header']['raw_data']['number'];
                const transactions = block['transactions'];

                for (const transaction of transactions) {
                    if (!transaction['ret'] || !transaction['raw_data'] || !transaction['txID']) {
                        continue;
                    }

                    const status = transaction['ret'][0]['contractRet'];
                    if (status !== 'SUCCESS') {
                        continue;
                    }

                    const txid = transaction['txID'];
                    const transactionValue = transaction['raw_data']['contract'][0]['parameter']['value'];

                    // //? trx in trc20 network-deposit
                    if (transactionValue['amount'] && !transactionValue['asset_name']) {
                        let ins = 1;
                        if (transactionValue['owner_address']) {
                            const ownerAddress = transactionValue['owner_address'].toUpperCase();
                            if (ownerAddress === tronHelper.toHex(adminPublicKey)) {
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
                        const transactionAddress = { txid: txid, amount: amount, block: blockNumber };
                        depositTransactions[to] = depositTransactions[to] || [];
                        depositTransactions[to].push(transactionAddress);
                        recipientAddresses.push(to);

                        //? logger
                        console.log(depositTransactions);
                        console.log(recipientAddresses);
                    }

                    //? trc20 token-deposit
                    if (transactionValue['data'] && transactionValue['contract_address']) {
                        const contractAddress_Tx = transactionValue['contract_address'];
                        const token = tokens.find(x => x.network.contractAddressHex === contractAddress_Tx);
                        if (token) {
                            console.log(token);
                            console.log(transactionValue);

                            // const data = transactionValue.data;
                            // const txdata = data.substr(8);
                            // let to = txdata.substr(0, 64).substring(22).toUpperCase();
                            // to = "41" + to.substr(2);
                            // const balData = parseInt(txdata.substr(64), 16);
                            // const amt = balData / token.decimalPoint;
                            // const amount = parseFloat(amt.toFixed(8));
                            // const transArress = { txid: txid, amount: amount, block: blkNum };
                            // depositTransactions[to] = depositTransactions[to] || [];
                            // depositTransactions[to].push(transAddress);
                            // recipientAddresses.push(to);
                            // //? logger
                            // console.log(depositTransactions);
                            // console.log(recipientAddresses);

                        }
                    }
                }
            }

            //TODO check
            // if (blockNumber > 0) {
            //     //update last block number
            // }

            if (recipientAddresses.length === 0) {
                return;
            }

            logger.debug("Deposits deposit TRx !empty(toAddr)");

            const userAddressDocuments = await UserAddressRepository.getCoinAddressesByTagAndCurrency(symbol, recipientAddresses);
            if (userAddressDocuments.length === 0) {
                return;
            }

            logger.debug("Deposits 496 wallet DepositFounds chcek ...");

            for (const userAddress of userAddressDocuments) {
                const userId = userAddress.user_id;

                const trxAddress = userAddress.filter(item => item.address.currency === "TRX");
                if (trxAddress.length === 0) {
                    continue;
                }

                const addressValue = Object.values(trxAddress)[0];
                const account = addressValue.value.trim();
                const tag = addressValue.tag.trim();
                const transactions = depositTransactions[tag] || [];

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
                        currency: symbol,
                        amount: trxAmount,
                        payment_type: 'Tron (TRX)',
                        status: DepositState.COMPLETED,
                        currency_type: CryptoType.CRYPTO,
                        address_info: account,
                        block
                    };
                    await this.updateUserWallet(data);
                    logger.info("Deposits  516 create new deposit trx " + JSON.stringify(data));
                }
            }
        }
        catch (error) {
            logger.error(`updateRippleWalletBalances|exception`, { currency }, error);
        }
    }

    //? add user Deposit, update userWallet 
    updateUserWallet = async (data) => {
        const { txid, user_id, currency, amount, payment_type, status, currency_type, exeTime, address_info } = data;
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
}

module.exports = DepositService;