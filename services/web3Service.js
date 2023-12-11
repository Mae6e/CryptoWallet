

//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');

//? utils
const { DepositState, CryptoType, PaymentType, TokenPaymentType } = require('../utils/constants');

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
  updateWeb3WalletBalances = async (currency, networkType) => {
    try {
      //? currency info
      const { network, decimalPoint } = currency.networks.find(x => x.network.type === networkType);
      if (!network || !decimalPoint) {
        logger.debug(`updateWeb3WalletBalances|invalid data`, { currency, networkType });
        return;
      }
      let startBlockNumber = network.lastBlockNumber || 10000;
      const symbol = network.symbol;
      const sitePublicKey = network.siteWallet.publicKey.toLowerCase();
      const networkId = network._id;

      logger.info(`updateWeb3WalletBalances|currency information`, currency, networkType);

      const endBlockNumber = startBlockNumber + 100;
      logger.debug(`updateWeb3WalletBalances|start`, { startBlockNumber, endBlockNumber });

      //? get all tokens and format tokens data
      const tokens = await utilityService.getAllTokensByNetwork(networkId);

      for (let i = startBlockNumber + 1; i <= endBlockNumber; i++) {
        const transactions = await web3Helper.getTransactionsByBlockNumber(networkType, i);
        if (!transactions || transactions.length === 0) {
          logger.error(`updateWeb3WalletBalances|deposit block has empty results`,
            { transactions, startBlockNumber, currentBlockNumber: i });
          continue;
        }

        logger.info(`updateWeb3WalletBalances|tracking transactions of block`, { transactions: transactions.length, currentBlockNumber: i });

        const { adminTransactions, recipientTransactions } = await this.filterTransactions({ transactions, sitePublicKey, networkType });
        logger.info(`updateWeb3WalletBalances|get result of track transactions`, {
          currentBlockNumber: i,
          recipientTransactions: recipientTransactions.length,
          adminTransactions: adminTransactions.length
        });

        const data = {
          symbol, network: networkId, blockNumber: i,
          adminTransactions, recipientTransactions,
          networkType, decimalPoint, tokens
        };

        await this.saveWeb3Transactions(data);
      }
    } catch (error) {
      logger.error(`updateWeb3WalletBalances|exception`, { networkType }, error);
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
        for (const tokenData of response) {
          if (tokenData.to === sitePublicKey) {
            adminTransactions.push(tokenData);
          } else if (tokenData.from !== sitePublicKey) {
            recipientTransactions.push(tokenData);
          }
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
  saveWeb3Transactions = async (data) => {
    const { symbol, network, blockNumber, adminTransactions, recipientTransactions, decimalPoint, tokens, networkType } = data;

    //? check user deposit
    await this.processRecipientTransactions({ recipientTransactions, tokens, symbol, decimalPoint, blockNumber, networkType });

    //? check admin deposit
    await this.processAdminTransactions({ adminTransactions, tokens, symbol, decimalPoint, blockNumber, networkType });

    //? update the block and date of executed
    await NetworkRepository.updateLastStatusOfNetwork(network, blockNumber, new Date());
    logger.info(`saveWeb3Transactions|changeBlockState`, { network, blockNumber });
  }


  //? check transactions for users
  processRecipientTransactions = async (data) => {
    const { recipientTransactions, tokens, symbol, decimalPoint, blockNumber, networkType } = data;
    //? check user wallet update
    if (recipientTransactions.length === 0) {
      logger.info(`processRecipientTransactions|not exist recipientTransactions`, data);
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
          amount = (Number(value) / Math.pow(10, token.decimalPoint)).toFixed(8);
          paymentType = TokenPaymentType[networkType];
          currency = token.symbol;
        }
        else {

          const receiptResult = await web3Helper.getTransactionReceiptByHash(networkType, hash);
          if (!receiptResult) {
            logger.error(`processRecipientTransactions|can not check the status of transaction`, { networkType, hash });
            continue;
          }

          if (receiptResult.status !== BigInt(1))
            continue;

          amount = Number(value) / Math.pow(10, decimalPoint);
          paymentType = PaymentType[networkType];
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
        else {
          logger.warn(`processRecipientTransactions|can not update user balance for ${currency}`, data);
        }
      }
    }
  }


  //? check transactions for admin
  processAdminTransactions = async (data) => {
    const { adminTransactions, tokens, symbol, decimalPoint, blockNumber, networkType } = data;
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
        amount = Number(value) / Math.pow(10, token.decimalPoint);
        currency = token.symbol;
      }
      else {
        const receiptResult = await web3Helper.getTransactionReceiptByHash(networkType, hash);
        if (!receiptResult) {
          logger.error(`processAdminTransactions|can not check the status of transaction`, { networkType, hash });
          continue;
        }

        if (receiptResult.status !== BigInt(1))
          continue;

        amount = Number(value) / Math.pow(10, decimalPoint);
        currency = symbol;
      }

      const data = {
        txid: hash,
        amount,
        currency
      };

      logger.info(`processAdminTransactions|check admin deposit for ${currency}`, { blockNumber, data });
      const response = await utilityService.updateAdminWallet(data);
      if (response) {
        logger.info(`processAdminTransactions|added admin deposit for ${currency}`, { blockNumber, data });
      }
      else {
        logger.warn(`processAdminTransactions|can not add admin deposit for ${currency}`, { blockNumber, data });
      }
    }
  }

  //? find token by contract
  findTokenByContract = (tokens, contract) => {
    return tokens.find(token => token.contract === contract);
  }

}

module.exports = Web3Service;

