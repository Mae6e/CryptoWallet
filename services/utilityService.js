
//? repositories
const CurrenciesRepository = require('../repositories/currenciesRepository');
const UserWalletRepository = require('../repositories/userWalletRepository');
const DepositRepository = require('../repositories/depositRepository');
const WltDepositsRepository = require('../repositories/wltDepositsRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');

//? utils
const { NetworkType } = require('../utils/constants');

//? helper
const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const TronHelper = require('../utils/tronHelper');
const tronHelper = new TronHelper();

const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

//? logger
const logger = require('../logger')(module);

const runWorkers = require('../workers/runWorkers');

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
        const updateBal = parseFloat(balance) + parseFloat(amount);
        await UserWalletRepository.updateUserWallet({ user: user_id, currency, amount: updateBal.toFixed(12) });

        //console.log("userWallet", updateBal);

        //TODO SEND SMS
        return true;
    }

    //? add admin Deposit
    updateAdminWallet = async (data) => {
        const { txid, currency, amount } = data;
        const txnExists = await WltDepositsRepository.checkExistsTxnId(txid, amount);
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
                ? tronHelper.toHex(networkObject.contractAddress) : undefined
        };

        //? format tokens data and get hex value 
        const tokens = tokenDocuments.map(obj => {
            const networkObj = obj.networks.find(x => x.network._id.equals(network));
            return {
                currencyId: obj._id,
                symbol: obj.symbol,
                type: networkObj.network.type,
                decimalPoint: networkObj.decimalPoint,
                contract: networkObj.contractAddress,
                contractHex: getContractAddress(networkObj),
                adminWallet: networkObj.adminWallet
            };
        });

        logger.debug('getAllTokensByNetwork|tokens information', tokens);
        return tokens;
    };


    //! skip
    getAllTokensWithNetworkDetails = async (network) => {
        const tokenDocuments = await CurrenciesRepository.getAllTokens(network);
        if (!tokenDocuments) return [];

        //? format tokens data and get hex value 
        const tokens = tokenDocuments.map(obj => {
            const networkObj = obj.networks.find(x => x.network._id.equals(network));
            return {
                currencyId: obj._id,
                currency: obj.symbol,
                decimalPoint: networkObj.decimalPoint,
                contractAddress: networkObj.contractAddress,
                adminAddress: networkObj.adminAddress
            };
        });

        logger.debug('getAllTokensWithNetworkDetails|tokens information', tokens);
        return tokens;
    };

    getAllDepositsByStatus = async (data) => {
        return await DepositRepository.getAllDepositsByStatus(data);
    }

    getUserAddressesByUsers = async (data) => {
        return await UserAddressRepository.getUserAddressesByUsers(data);
    }

    UpdateDepositsByStatus = async (data) => {
        await DepositRepository.UpdateDepositsByStatus(data);
    }

    UpdateDepositsToCompeleted = async (data) => {
        await DepositRepository.UpdateDepositsToCompeleted(data);
    }

    getLastOnlineBlockNumber = async (networkType) => {
        let index;
        switch (networkType) {
            case NetworkType.TRC20:
                index = await tronHelper.getCurrentBlock();
                break;
            case NetworkType.ERC20:
            case NetworkType.ARBITRUM:
            case NetworkType.POLYGON:
            case NetworkType.BSC:
                {
                    index = await web3Helper.getLatestBlockNumber(networkType);
                    index = Number(index);
                    break;
                }
            case NetworkType.RIPPLE:
                index = await nodeHelper.getLastLedgerIndex();
                break;
            default:
                break;
        }
        return index;
    };


    getTransactionsByNetwork = async (params) => {
        if (params.networkType === NetworkType.TRC20) {
            return await this.getTrc20Transactions(params);
        }
        else if (params.networkType === NetworkType.BSC ||
            params.networkType === NetworkType.ERC20 ||
            params.networkType === NetworkType.POLYGON ||
            params.networkType === NetworkType.ARBITRUM) {
            return await this.getWeb3Transactions(params);
        }
        else if (params.networkType === NetworkType.RIPPLE) {
            return await nodeHelper.getRippleLedgerTransactions(params);
        }
    }


    getWeb3Transactions = async ({ networkType, initialBlockIndex, endBlockIndex, sitePublicKey }) => {
        try {

            if (initialBlockIndex >= endBlockIndex) return false;

            const response = await runWorkers.web3TrackTransactionsCreateWorker(
                { network: networkType, fromBlock: initialBlockIndex, toBlock: endBlockIndex });

            const transactions = response.result;

            if (!transactions || transactions.length === 0) {
                logger.error(`getWeb3Transactions|deposit block has empty results`,
                    { transactions, initialBlockIndex, endBlockIndex });
                return false;
            }

            sitePublicKey = sitePublicKey.toLowerCase();
            logger.info(`getWeb3Transactions|tracking transactions of block`, { transactions: transactions.length, initialBlockIndex });

            const { adminTransactions, recipientTransactions } = await web3Helper.filterTransactions({ transactions, sitePublicKey });
            logger.info(`getWeb3Transactions|get result of track transactions`, {
                initialBlockIndex,
                endBlockIndex,
                recipientTransactions: recipientTransactions.length,
                adminTransactions: adminTransactions.length,
                networkType
            });

            return { adminTransactions, recipientTransactions };
        }
        catch (error) {
            logger.error(`getWeb3Transactions|exception`, { networkType, initialBlockIndex, endBlockIndex }, error.stack);
            return false;
        }
    }


    //? track transactions in blocks
    getTrc20Transactions = async ({ sitePublicKey, initialBlockIndex, endBlockIndex }) => {

        try {
            let recipientTransactions = [];
            let blockNumber;
            //TODO adminTransactions

            const blocks = await nodeHelper.getTrc20BlockTransactions(initialBlockIndex, endBlockIndex);
            if (!blocks) {
                return 0;
            }
            const sitePublicKeyHex = tronHelper.toHex(sitePublicKey).toUpperCase();
            //? find blocks
            for (const block of blocks) {
                if (!block['block_header'] || !block['transactions']) {
                    continue;
                }
                blockNumber = block['block_header']['raw_data']['number'];
                const transactions = block['transactions'];

                logger.info(`processTransactions|length`, { transactions: transactions.length, blockNumber });

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

                        const amount = transactionValue['amount'];
                        const to = transactionValue['to_address'].toUpperCase();
                        const transactionAddress = { key: to, txid, amount, block: blockNumber };
                        //? added trx to array    
                        recipientTransactions.push(transactionAddress);
                    }

                    //? trc20 token-deposit
                    else if (transactionValue['data'] && transactionValue['contract_address']) {
                        const contract = transactionValue['contract_address'];

                        //? decode data for value and destination address
                        const data = transactionValue.data;
                        const txdata = data.substr(8);
                        let to = txdata.substr(0, 64).substring(22).toUpperCase();
                        to = "41" + to.substr(2);
                        const amount = parseInt(txdata.substr(64), 16);
                        const transactionAddress = {
                            key: to, txid,
                            amount, block: blockNumber, contract
                        };

                        //? added trx to array    
                        recipientTransactions.push(transactionAddress);
                    }
                }
            }

            logger.debug(`processTransactions|get recipientTransactions`, { recipientTransactions: recipientTransactions.length, initialBlockIndex, endBlockIndex });
            return ({ recipientTransactions });
        }
        catch (error) {
            return 0;
        }
    }

}


module.exports = UtilityService;