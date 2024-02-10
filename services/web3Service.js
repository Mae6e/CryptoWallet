
//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const AdminTransferRepository = require('../repositories/adminTransferRepository');
const TokenFeeRepository = require('../repositories/tokenFeeRepository');

//? utils
const { DepositState, CryptoType, PaymentType,
  TokenPaymentType, DepositMoveStatus, NetworkType, AdminTransferStatus,
  AdminTransferTxtStatus, TokenFeeStatus, CoefficientTransfer, WalletProvider } = require('../utils/constants');

const { decryptText } = require('../utils/cryptoEngine');

//? helpers
const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

const NodeHelper = require('../utils/nodeHelper');
const nodeHelper = new NodeHelper();

//? services
const UtilityService = require('./utilityService');
const utilityService = new UtilityService();

//? logger
const logger = require('../logger')(module);

class Web3Service {

  //? main function for recognize for deposit
  updateWeb3WalletBalances = async (depositParams) => {
    const { currency, networkType, initialBlockIndex,
      hasUpdatedBlockIndex, recipientTransactions, adminTransactions } = depositParams;
    try {
      //? currency info
      const { network, adminWallet, decimalPoint } = currency.networks.find(x => x.network.type === networkType);
      if (!network || !decimalPoint || !adminWallet || !network.siteWallet) {
        logger.debug(`updateWeb3WalletBalances|invalid data`, { networkType, decimalPoint, adminWallet });
        return;
      }

      const symbol = network.symbol;
      const networkId = network._id;

      logger.info(`updateWeb3WalletBalances|currency information`, networkType);
      logger.debug(`updateWeb3WalletBalances|start`, { initialBlockIndex });

      //? get all tokens and format tokens data
      const tokens = await utilityService.getAllTokensByNetwork(networkId);

      const data = {
        symbol, blockNumber: initialBlockIndex,
        adminTransactions, recipientTransactions,
        networkType, decimalPoint, tokens, networkId,
        adminWallet, siteWallet: network.siteWallet
      };

      await this.saveWeb3Transactions(data);

      if (hasUpdatedBlockIndex) {
        //? update the block and date of executed
        await NetworkRepository.updateLastStatusOfNetwork(networkId, initialBlockIndex);
        logger.info(`updateWeb3WalletBalances|changeBlockState`, { networkId, initialBlockIndex });
      }

    } catch (error) {
      logger.error(`updateWeb3WalletBalances|exception`, { networkType }, error.stack);
    }
  }


  //? save user balance
  saveWeb3Transactions = async (data) => {
    const { symbol, blockNumber,
      adminTransactions, recipientTransactions,
      decimalPoint, tokens, networkType, networkId, adminWallet, siteWallet } = data;

    //? check user deposit
    await this.processRecipientTransactions({ recipientTransactions, tokens, symbol, decimalPoint, blockNumber, networkType, networkId });

    //? check admin deposit
    await this.processAdminTransactions({ adminTransactions, tokens, symbol, decimalPoint, blockNumber, networkType });

    //! transfer
    //? token transfer
    for (const item of tokens) {
      await this.web3ExternalTransferTokens({
        networkId,
        currencyId: item.currencyId,
        symbol,
        currency: item.symbol,
        decimalPoint: item.decimalPoint,
        networkDecimalPoint: decimalPoint,
        contract: item.contract,
        adminWallet: item.adminWallet,
        siteWallet: siteWallet,
        networkType
      });
    }

    //? transfer
    await this.web3ExternalTransfer({
      networkId,
      networkType, currency: symbol, decimalPoint, adminWallet, siteWallet
    });
  }


  //? check transactions for users
  processRecipientTransactions = async (data) => {
    const { recipientTransactions, tokens, symbol, decimalPoint, blockNumber, networkType } = data;
    //? check user wallet update
    if (recipientTransactions.length === 0) {
      logger.info(`processRecipientTransactions|not exist recipientTransactions`, data);
      return;
    }

    const userAddressDocuments = await UserAddressRepository.getWeb3UserAddressesByValue(recipientTransactions.map(x => x.to));
    if (userAddressDocuments.length === 0) {
      logger.info(`processRecipientTransactions|not found userAddressDocuments`, { blockNumber, recipientTransactions: recipientTransactions.length });
      return;
    }

    logger.info(`processRecipientTransactions|find the userAddressDocuments`, { blockNumber, userAddressDocuments: userAddressDocuments.length });

    for (const userAddress of userAddressDocuments) {
      const { user_id, address } = userAddress;
      if (!user_id) {
        continue;
      }

      const currentAddresses = address.filter(x => x.walletProvider === WalletProvider.Geth);
      if (currentAddresses.length === 0) {
        continue;
      }

      logger.debug(`processRecipientTransactions|waiting for update balance for user`, { blockNumber, user_id, networkType });

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
          user_id,
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
    return tokens.find(token => token.contract && token.contract.toLowerCase() === contract);
  }


  //? transfer web3Coin documents to site wallet
  web3ExternalTransfer = async (data) => {
    const { networkId, networkType, currency, decimalPoint, adminWallet, siteWallet } = data;
    try {

      logger.debug(`web3ExternalTransfer|start`, { currency, adminWallet });

      const { publicKey } = adminWallet;
      if (!networkId || !networkType || !currency || !publicKey || !decimalPoint || !siteWallet) {
        logger.warn(`web3ExternalTransfer|invalid data`, { currency, adminWallet });
      }

      //? get all not_moved deposit document
      const notMovedDepositDocuments = await utilityService.getAllDepositsByStatus(
        {
          currency, move_status: DepositMoveStatus.NOT_MOVED,
          payment_type: PaymentType[networkType]
        });

      logger.info(`web3ExternalTransfer|get all not_moved deposit document`, { currency, length: notMovedDepositDocuments.length });
      if (!notMovedDepositDocuments.length) {
        return;
      }

      //? get all user's address in not_moved deposi document
      const userAddressDocuments = await UserAddressRepository.getWeb3UserAddressesByUsers({
        users: notMovedDepositDocuments.map(x => x.user_id)
      });

      logger.debug(`web3ExternalTransfer|get all user's document`, { currency, length: userAddressDocuments.length });

      //! fee
      const estimateFee = await nodeHelper.estimateWeb3Fee(networkType);
      if (!estimateFee) {
        //TODO SEND SMS
        logger.error(`web3ExternalTransfer|fee is zero`, { networkType, estimateFee });
        return;
      }
      logger.debug(`web3ExternalTransfer|get fee`, { networkType, estimateFee });

      const { fee, tokenFee } = estimateFee;
      //! end fee

      for (const document of userAddressDocuments) {

        const { user_id, address } = document;
        const userAddress = address.find(x => x.walletProvider === WalletProvider.Geth);

        //? get user secret key
        const userPrivateKey = decryptText(userAddress.secret);
        const userPublicKey = userAddress.value;
        if (!userPrivateKey) {
          //TODO SEND SMS
          logger.error(`web3ExternalTransfer|dont exist secret`, { currency, userPublicKey });
          continue;
        }

        //? check token fee
        const isExistTokenFee = await TokenFeeRepository.existsActiveTokenFeesByNetwork({
          network: networkId, user_id
        });
        logger.info(`web3ExternalTransfer|check exist token fee document`, { currency, userPublicKey, isExistTokenFee });

        if (isExistTokenFee) {
          //TODO SEND SMS
          logger.warn(`web3ExternalTransfer|exist token fee document`, { currency, userPublicKey, isExistTokenFee });
          continue;
        }

        //? get balance of user address
        let transferAmount = await nodeHelper.getWeb3Balance(networkType, userPublicKey);
        if (!transferAmount) {
          //TODO SEND SMS
          logger.error(`web3ExternalTransfer|the online value of transferAmount is zero`, { currency, userPublicKey, transferAmount });
          continue;
        }

        //? transfer amount 
        if (transferAmount < tokenFee) {
          //TODO SEND SMS
          logger.error(`web3ExternalTransfer|transferAmount less than web3FeeLimit`, { currency, userPublicKey, transferAmount, tokenFee });
          continue;
        }

        //? get sitewallet balance
        const siteWalletPublicKey = siteWallet.publicKey;
        const siteWalletBalance = await nodeHelper.getWeb3Balance(networkType, siteWalletPublicKey);

        let outputTransaction;
        let updateDepositMove = true;

        logger.info(`web3ExternalTransfer|wallet balance`, {
          siteWalletBalance, transferAmount,
          siteWalletPublicKey, userPublicKey
        });


        let web3StockAdminFeeLimit = web3Helper.fromGWei(networkType, CoefficientTransfer[networkType] * tokenFee);
        web3StockAdminFeeLimit = Number(web3Helper.toGWei(networkType, Math.ceil(web3StockAdminFeeLimit))).toFixed(3);

        //? check siteWallet have value web3Coin
        if (siteWalletBalance >= web3StockAdminFeeLimit - (fee * 1.5)) {
          //?transfer all transferAmount
          logger.info(`web3ExternalTransfer|siteWalletBalance greater than web3StockAdminFeeLimit. move coin to admin'`, { web3StockAdminFeeLimit, siteWalletBalance, networkType });
          //? sign transaction to network
          outputTransaction = await nodeHelper.signWeb3Transaction({ userPublicKey, userPrivateKey, publicKey, transferAmount, networkType });
          logger.info(`web3ExternalTransfer|currency move to addmin wallet`, { outputTransaction, adminPublicKey: publicKey, transferAmount, userPublicKey, networkType, estimateFee });
        }
        else {
          //? transfer the part of transferAmount to site wallet
          //? charge site wallet 
          let diffForceValue = web3StockAdminFeeLimit - siteWalletBalance;
          if (diffForceValue < tokenFee)
            diffForceValue = Math.ceil(tokenFee).toFixed(4);

          if (((transferAmount - diffForceValue) > (3 * tokenFee))) {
            logger.info(`web3ExternalTransfer|the diffForceValue can be transfer to admin wallet`, { transferAmount, userPublicKey, diffForceValue, tokenFee });
            transferAmount = diffForceValue;
            updateDepositMove = false;
          }
          //? sign transaction to network
          outputTransaction = await nodeHelper.signWeb3Transaction({ userPublicKey, userPrivateKey, siteWalletPublicKey, transferAmount, networkType });
          logger.info(`web3ExternalTransfer|part of currency move to admin wallet`, { outputTransaction, adminPublicKey: publicKey, transferAmount, userPublicKey, diffForceValue, networkType, estimateFee });
        }

        if (!outputTransaction || !outputTransaction.result || !outputTransaction.amount) {
          //TODO SEND SMS
          logger.error(`web3ExternalTransfer|did not create success transaction`, { currency, transferAmount, userPublicKey, outputTransaction });
          continue;
        }

        //? save transfer data to database
        //TODO
        transferAmount = web3Helper.fromWei(networkType, outputTransaction.amount);
        if (updateDepositMove) {
          await utilityService.UpdateDepositsByStatus({ currency, address_info: userPublicKey });
        }
        await TokenFeeRepository.deactiveTokenFeesByNetwork({
          network: networkId, user_id
        });
        await AdminTransferRepository.create({
          user_id, currency, address: userPublicKey,
          amount: transferAmount, transaction: outputTransaction.result
        });
        logger.info(`web3ExternalTransfer|save transfer data to database`, { currency, transferAmount, userPublicKey, outputTransaction });

      }

      logger.info(`web3ExternalTransfer|complete transfer`, { currency, adminWallet });

    } catch (error) {
      //TODO SEND SMS
      logger.error(`web3ExternalTransfer|exception`, { currency, adminWallet }, error.stack);
    }
  }


  //? transfer web3Token documents to site wallet
  web3ExternalTransferTokens = async (data) => {
    try {
      const { networkId, currencyId, networkType, symbol, currency, decimalPoint,
        networkDecimalPoint, contract, adminWallet, siteWallet } = data;

      logger.debug(`web3ExternalTransferTokens|start`, { currency, adminWallet });

      const { publicKey } = adminWallet;
      if (!symbol || !networkId || !currencyId || !currency || !networkDecimalPoint || !publicKey || !decimalPoint || !siteWallet || !contract) {
        logger.warn(`web3ExternalTransferTokens|invalid data`, { symbol, currency, adminWallet });
      }

      //? get all not_moved deposit tokens document
      const notMovedDepositDocuments = await utilityService.getAllDepositsByStatus({
        currency, move_status: DepositMoveStatus.NOT_MOVED,
        payment_type: TokenPaymentType[networkType]
      });

      logger.info(`web3ExternalTransferTokens|get all not_moved deposit document`, { currency, length: notMovedDepositDocuments.length });

      if (!notMovedDepositDocuments.length) {
        return;
      }

      //? get all user's address in not_moved deposi document
      const userAddressDocuments = await UserAddressRepository.getWeb3UserAddressesByUsers({
        users: notMovedDepositDocuments.map(x => x.user_id)
      });
      logger.debug(`web3ExternalTransferTokens|get all user's document`, { currency, length: userAddressDocuments.length });

      for (const document of userAddressDocuments) {

        const { user_id, address } = document;
        const userAddress = address.find(x => x.walletProvider === WalletProvider.Geth);

        const userPublicKey = userAddress.value;
        const userPrivateKey = decryptText(userAddress.secret);

        const tokenBalance = await nodeHelper.getWeb3TokenBalance(networkType, contract, userPublicKey);
        if (!tokenBalance || tokenBalance === '0') {
          //TODO SEND SMS
          logger.error(`web3ExternalTransferTokens|the online value of tokenBalance is zero`, { currency, userPublicKey, tokenBalance });
          continue;
        }

        const coinBalance = await nodeHelper.getWeb3Balance(networkType, userPublicKey);
        //TODO
        //? get contract transaction fee
        const feeObject = { address: userPublicKey, to: publicKey, amount: tokenBalance, contractAddress: contract, networkType };
        let tokenFeeAmount = await nodeHelper.calculateWeb3TokenFee(feeObject);

        if (!tokenFeeAmount) {
          logger.error(`web3ExternalTransferTokens|fee value`, { tokenFeeAmount, feeObject });
          continue;
        }

        logger.info(`web3ExternalTransferTokens|extra info`, { tokenFeeAmount, coinBalance, networkType });

        if (coinBalance < tokenFeeAmount) {
          //? check token fee
          const isExistTokenFee = await TokenFeeRepository.existsActiveTokenFeesByCurrency({
            network: networkId,
            currency: currencyId,
            user_id
          });
          logger.info(`web3ExternalTransferTokens|check exist token fee document`, { currency, user_id, isExistTokenFee });

          const siteWalletPrivateKey = decryptText(siteWallet.privateKey);
          const siteWalletPublicKey = siteWallet.publicKey;

          if (!isExistTokenFee) {
            logger.info(`web3ExternalTransferTokens|moving Fee to account without TokenFee`, { currency, userPublicKey, tokenFeeAmount });
            const transferFeeResponse = await this.moveWeb3CoinFeeToAccount(
              {
                network: networkId, networkType, currency: currencyId,
                siteWalletPrivateKey, userPublicKey,
                siteWalletPublicKey,
                user_id, tokenFeeAmount
              });
            if (transferFeeResponse) {
              await this.moveWeb3TokenToAccount(
                {
                  currency, networkId, currencyId, userPrivateKey, userPublicKey,
                  publicKey, user_id, coinBalance,
                  tokenFeeAmount, tokenBalance, contract, decimalPoint, networkType
                }
              );
            }
          }
          else {

            const latestTokenFee = await TokenFeeRepository.getLatestActiveFeeMove({
              user_id, address: userPublicKey,
              currency: currencyId, network: networkId
            });
            //? Fee moved again after 8 minutes for account
            const updated_time = new Date(latestTokenFee.updated_at).getTime();
            if (Date.now() - updated_time >= 8 * 60 * 1000) {
              logger.info(`web3ExternalTransferTokens|moving Fee to account- 8 min`, { currency, userPublicKey, tokenFeeAmount });
              const transferFeeResponse = await this.moveWeb3CoinFeeToAccount(
                {
                  network: networkId, networkType, currency: currencyId,
                  siteWalletPrivateKey, userPublicKey,
                  siteWalletPublicKey,
                  user_id, tokenFeeAmount
                });
              logger.warn(`web3ExternalTransferTokens|Fee moved again after 8 minutes`, { currency, userPublicKey, user_id, tokenFeeAmount });

              if (transferFeeResponse) {
                await this.moveWeb3TokenToAccount(
                  {
                    currency, networkId, currencyId, userPrivateKey, userPublicKey,
                    publicKey, user_id, coinBalance,
                    tokenFeeAmount, tokenBalance, contract, decimalPoint, networkType
                  });
              }
            }
          }
        } else {
          await this.moveWeb3TokenToAccount(
            {
              currency, networkId, currencyId, userPrivateKey, userPublicKey,
              publicKey, user_id, coinBalance,
              tokenFeeAmount, tokenBalance, contract, decimalPoint, networkType
            });
        }
      }
    }
    catch (error) {
      logger.error(`web3ExternalTransferTokens|exception`, { currency: data.currency }, error.stack);
    }
  }


  //#region move coin or token to user account

  moveWeb3CoinFeeToAccount = async (data) => {
    const { network, currency, siteWalletPrivateKey,
      siteWalletPublicKey, userPublicKey, user_id,
      tokenFeeAmount, networkType } = data;

    const outputTransaction = await nodeHelper.signWeb3Transaction({
      siteWalletPublicKey, siteWalletPrivateKey,
      userPublicKey, tokenFeeAmount, networkType
    });

    if (!outputTransaction || !outputTransaction.result || !outputTransaction.amount) {
      //TODO SEND SMS
      logger.error(`moveWeb3CoinFeeToAccount|fail the result of signWeb3Transaction`, { currency, userPublicKey, tokenFeeAmount, outputTransaction });
      return false;
    }

    logger.info(`moveWeb3CoinFeeToAccount|success the result of signWeb3Transaction`, { currency, userPublicKey, outputTransaction });
    const fees = web3Helper.fromWei(networkType, tokenFeeAmount);
    const model = {
      user_id,
      address: userPublicKey,
      currency,
      network,
      fees,
      status: TokenFeeStatus.ACTIVE,
      txid: outputTransaction.result
    };

    logger.info(`moveWeb3CoinFeeToAccount|creating token fee document`, model);

    await TokenFeeRepository.create(model);
    logger.info(`moveWeb3CoinFeeToAccount|end of func`, model);
    return true;
  }



  moveWeb3TokenToAccount = async (data) => {

    const { currency, networkId, currencyId, userPrivateKey, userPublicKey,
      publicKey, user_id, coinBalance, networkType,
      tokenFeeAmount, tokenBalance, contract, decimalPoint } = data;

    logger.info(`web3ExternalTransferTokens|signing token coin`, { currency, userPublicKey, user_id, coinBalance, tokenFeeAmount, tokenBalance });

    //! dorost
    const outputTransaction = await nodeHelper.signWeb3TokenTransaction(
      { userPublicKey, publicKey, tokenBalance, contract, userPrivateKey, networkType });

    logger.info(`web3ExternalTransferTokens|signed token coin`, { currency, userPublicKey, outputTransaction });

    if (!outputTransaction || !outputTransaction.result) {
      //TODO SEND SMS
      logger.error(`web3ExternalTransferTokens|fail sign transaction`, { currency, contract, publicKey, user_id, tokenBalance });
      return;
    }

    //? complete status of deposit collection
    await utilityService.UpdateDepositsToCompeleted({ currency, address_info: userPublicKey });
    //? deactive token fee
    await TokenFeeRepository.deactiveTokenFeesByCurrency({ network: networkId, currency: currencyId, user_id });
    //? create admin transfer
    await AdminTransferRepository.createKeeper({
      user_id, currency, address: userPublicKey,
      amount: Number(tokenBalance) / Math.pow(10, decimalPoint), transaction: outputTransaction.result
    });
    logger.info(`web3ExternalTransferTokens|save transfer data to database`, { currency, tokenBalance, userPublicKey, outputTransaction });

    //TODO SEND SMS
  }

  //#endregion coin or token to user account

}



module.exports = Web3Service;

