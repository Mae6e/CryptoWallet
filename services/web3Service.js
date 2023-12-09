

//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');

//? utils
const { DepositState, CryptoType } = require('../utils/constants');

//? helpers
const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

//? services
const UtilityService = require('./utilityService');
const utilityService = new UtilityService();

//? logger
const logger = require('../logger')(module);

class Web3Service {

  //? main function for recognize for deposit
  updateBscWalletBalances = async (currency) => {
    try {
      //? currency info
      const { network, decimalPoint } = currency.networks[0];
      let startBlockNumber = network.lastBlockNumber || 10000;
      const symbol = network.symbol;
      const sitePublicKey = network.siteWallet.publicKey.toLowerCase();
      const networkType = network.type;
      const networkId = network._id;

      logger.info(`updateBscWalletBalances|currency information`, currency);

      const endBlockNumber = startBlockNumber + 100;
      logger.debug(`updateBscWalletBalances|start`, { startBlockNumber, endBlockNumber });

      //? get all tokens and format tokens data
      const tokens = await utilityService.getAllTokensByNetwork(networkId);

      for (let i = startBlockNumber; i <= endBlockNumber; i++) {
        const transactions = await web3Helper.getTransactionsByBlockNumber(networkType, i);
        if (!transactions || transactions.length === 0) {
          logger.error(`updateBscWalletBalances|deposit block has empty results`,
            { transactions, startBlockNumber, currentBlockNumber: i });
          continue;
        }

        logger.info(`updateBscWalletBalances|tracking transactions of block`, { transactions: transactions.length, currentBlockNumber: i });

        const { adminTransactions, recipientTransactions } = await this.filterTransactions({ transactions, sitePublicKey, networkType });
        logger.info(`updateBscWalletBalances|get result of track transactions`, {
          currentBlockNumber: i,
          recipientTransactions: recipientTransactions.length,
          adminTransactions: adminTransactions.length
        });

        const data = {
          symbol, network: networkId, blockNumber: i,
          adminTransactions, recipientTransactions,
          networkType, decimalPoint, tokens
        };

        await this.saveBscTransactions(data);
      }
    } catch (error) {
      logger.error(`updateBscWalletBalances|exception`, { currency }, error);
    }
  }


  //? track main currency and tokens transactions
  filterTransactions = async ({ transactions, sitePublicKey, networkType }) => {
    const adminTransactions = [];
    const recipientTransactions = [];

    //? find transactions for main currency and tokens
    for (const txObject of transactions) {
      const { to, value, hash, from, input } = txObject;
      if (from === to) continue;

      if (value === BigInt(0) || input !== '0x') {
        const response = await web3Helper.getContractTransactionsByHash(networkType, hash);
        if (response.length === 0) continue;

        if (response.to === sitePublicKey) {
          adminTransactions.push(...response);
        } else if (response.from !== sitePublicKey) {
          recipientTransactions.push(...response);
        }
      } else if (to) {
        const toLowerCase = to.toLowerCase();
        if (toLowerCase === sitePublicKey) {
          adminTransactions.push({ to: toLowerCase, value, hash, from });
        } else if (from !== sitePublicKey) {
          recipientTransactions.push({ to: toLowerCase, value, hash, from });
        }
      }
    }

    return { adminTransactions, recipientTransactions };
  }


  //? save user balance
  saveBscTransactions = async (data) => {
    const { symbol, network, blockNumber, adminTransactions, recipientTransactions, decimalPoint, tokens } = data;

    //? check user deposit
    await this.processRecipientTransactions({ recipientTransactions, tokens, symbol, decimalPoint, blockNumber });

    //? check admin deposit
    await this.processAdminTransactions({ adminTransactions, tokens, symbol, decimalPoint, blockNumber });

    //? update the block and date of executed
    await NetworkRepository.updateLastStatusOfNetwork(network, blockNumber, new Date());
    logger.info(`saveBscTransactions|changeBlockState`, { network, blockNumber });
  }


  //? check transactions for users
  processRecipientTransactions = async ({ recipientTransactions, tokens, symbol, decimalPoint, blockNumber }) => {
    //? check user wallet update
    if (recipientTransactions.length === 0) {
      logger.info(`processRecipientTransactions|not exist recipientTransactions`, { data });
      return;
    }

    const userAddressDocuments = await UserAddressRepository.getCoinAddressesByValueAndCurrency(symbol, recipientTransactions.map(x => x.to));
    if (userAddressDocuments.length === 0) {
      logger.info(`processRecipientTransactions|not found userAddressDocuments`, { blockNumber, recipientTransactions: recipientTransactions.length });
      return;
    }

    logger.info(`processRecipientTransactions|find the userAddressDocuments`, { blockNumber, userAddressDocuments: userAddressDocuments.length });

    for (const userAddress of userAddressDocuments) {
      const userId = userAddress.user_id;
      if (!userId) {
        continue;
      }

      const currentAddresses = userAddress.address.filter(addr => addr.currency === symbol);
      if (currentAddresses.length === 0) {
        continue;
      }

      logger.debug(`processRecipientTransactions|waiting for update balance for user`, { blockNumber, currentAddresses });

      const addressValue = currentAddresses[0].value.trim().toLowerCase();
      const transactions = recipientTransactions.filter(x => x.to === addressValue);

      logger.info(`processRecipientTransactions|count of transactions by user`, { addressValue, transactions: transactions.length });

      for (const transaction of transactions) {
        let { value, hash, contract } = transaction;

        if (value === BigInt(0)) {
          continue;
        }

        const isContract = !!contract;
        let amount;
        let paymentType;
        let currency;

        if (isContract) {
          const token = this.findTokenByContract(tokens, contract);
          if (!token) continue;
          amount = (Number(value) / token?.decimalPoint)?.toFixed(8);
          paymentType = 'BNB (BEP20)';
          currency = token.symbol;
        }
        else {
          amount = Number(value) / Math.pow(10, decimalPoint);
          paymentType = 'Binance Coin (BNB)';
          currency = symbol;
        }

        if (amount <= 0) {
          continue;
        }

        const data = {
          txid: hash,
          user_id: userId,
          currency,
          amount: parseFloat(amount),
          payment_type: paymentType,
          status: DepositState.COMPLETED,
          currency_type: CryptoType.CRYPTO,
          address_info: addressValue,
          block: blockNumber
        };

        logger.info(`processRecipientTransactions|check user wallet for new deposit ${currency}`, data);
        const response = await utilityService.updateUserWallet(data);
        if (response) {
          logger.info(`processRecipientTransactions|create new deposit ${currency} for user`, data);
        }
      }
    }
  }


  //? check transactions for admin
  processAdminTransactions = async ({ adminTransactions, tokens, symbol, decimalPoint, blockNumber }) => {
    for (const transaction of adminTransactions) {
      const { value, hash, contract } = transaction;

      if (value === BigInt(0)) {
        continue;
      }

      const isContract = !!contract;
      let amount;
      let currency;

      if (isContract) {
        const token = this.findTokenByContract(tokens, contract);
        if (!token) continue;
        amount = (Number(value) / token?.decimalPoint);
        currency = token.symbol;
      }
      else {
        amount = Number(value) / Math.pow(10, decimalPoint);
        currency = symbol;
      }

      const data = {
        txid: hash,
        amount,
        currency
      };

      logger.info(`processAdminTransactions|check admin balance for ${currency}`, { blockNumber, transaction });
      const response = await utilityService.updateAdminWallet(data);
      if (response) {
        logger.info(`processAdminTransactions|update admin balance for ${currency}`, { blockNumber, transaction });
      }
    }
  }

  //? find token by contract
  findTokenByContract = (tokens, contract) => {
    return tokens.find(token => token.contract === contract);
  }

}

module.exports = Web3Service;

