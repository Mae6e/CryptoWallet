
//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');

//? utils
const { DepositState, CryptoType } = require('../utils/constants');

//? helper
const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

const TronHelper = require('../utils/tronHelper');
const tronHelper = new TronHelper();

//? services
const UtilityService = require('./utilityService');
const utilityService = new UtilityService();

//? logger
const logger = require('../logger')(module);


class Trc20Service {

    //? Trc20-Deposit
    updateTrc20WalletBalances = async (currency) => {
        try {
            //? currency info
            const { network, decimalPoint } = currency.networks[0];

            let startBlockNumber = network.lastBlockNumber;
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

            const { recipientAddresses, depositTransactions } =
                await this.processTransactions({ blocks: result['block'], sitePublicKeyHex, decimalPoint });

            if (recipientAddresses.length === 0) {
                logger.warn(`updateTrc20WalletBalances|dont exist recipient addresses`,
                    { recipientAddresses: recipientAddresses.length, startBlockNumber, endBlockNumber });
            }
            else {
                //? sort data with bluckNumber
                depositTransactions.sort((a, b) => a.block - b.block);
                await this.saveTrc20Transactions({ symbol, recipientAddresses, depositTransactions });
            }
            //? update the block and date of executed
            await NetworkRepository.updateLastStatusOfNetwork(networkId, blockNumber, new Date());
            logger.info(`updateTrc20WalletBalances|changeBlockState-general`, { networkId, blockNumber });
        }
        catch (error) {
            logger.error(`updateTrc20WalletBalances|exception`, { currency }, error);
        }
    }


    //? track transactions in blocks
    processTransactions = async ({ blocks, sitePublicKeyHex, decimalPoint }) => {

        let recipientAddresses = [];
        let depositTransactions = [];
        let blockNumber;

        //? get all tokens in trc20 networks
        const tokens = await this.getAllTokensByNetwork(networkId);

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
    saveTrc20Transactions = async ({ symbol, recipientAddresses, depositTransactions }) => {
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
                    const updateUserWalletResponse = await utilityService.updateUserWallet(data);
                    logger.info("saveTrc20Transactions|check for new deposit trx", data);
                    if (updateUserWalletResponse) {
                        logger.info("saveTrc20Transactions|create new deposit trx", data);
                        //? update the block and date of executed
                        await NetworkRepository.updateLastStatusOfNetwork(networkId, block, new Date());
                        logger.info(`saveTrc20Transactions|changeBlockState`, { networkId, block });
                    }
                }
            }
        }
    }

}

module.exports = Trc20Service;
