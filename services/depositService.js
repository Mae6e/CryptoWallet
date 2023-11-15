
const axios = require('axios');

const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const UserWalletRepository = require('../repositories/userWalletRepository');
const DepositRepository = require('../repositories/depositRepository');

//? utils
const {
    CoinPaymentPrivateKey,
    CoinPaymentPublicKey,
    XRPAddress,
    CoinpaymentCurrencies,
    Web3Networks,
    NetworkName,
    NetworkSymbol } = require('../utils');

const { CurrencyType } = require('../utils/constants');

const { randomString } = require('../utils/walletHelper');
const { encryptText } = require('../utils/cryptoEngine');

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
        if (!currency) {
            return Response.warn('Invalid Currency');
        }

        let web3NetworkType;
        if (networkType) {
            web3NetworkType = this.getWeb3Network(networkType);
        }

        if (network.type == NetworkType.RIPPLE) {
            if (currency.type === CurrencyType.COIIN) {
                //! updateRippleWalletBalance
                this.updateRippleWalletBalances(currency.lastBlockNumber);
            } else {
                //! noting
            }
        }
        else if (network.type == NetworkType.TRC20) {
            if (currency.type === CurrencyType.COIIN) {

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

    updateRippleWalletBalances = async (lastblockNumber) => {
        try {
            const symbol = NetworkSymbol.XRP;

            const blockNumber = lastblockNumber > 0 ? lastblockNumber : "2022-09-12T00:00:00Z";
            const url = `${EXPLORER_RIPPLE.replace('ADDRESS', XRPAddress)}${blockNumber}`;
            //Logger.debug(`updateXrpBalance 1 => ${blockNumber} url ${url}`);

            const { result, count, payments } = await axios.get(url);
            // const res = JSON.parse(response);

            if (result !== 'success' || count === 0) {
                //! do someting
                //Logger.error(`UpdateXrpBalance problem => ${JSON.stringify(res)}`);
                return;
            }

            if (!payments || payments.length === 0) {
                //! do something
                return;
            }

            //const transactions = res.payments;
            // Logger.debug(`updateXrpBalance 2 success result count ${res.count}`);

            //let sendSms = false;
            for (const transaction of payments) {
                const amount = transaction.delivered_amount;
                const address = transaction.destination;
                const txid = transaction.tx_hash;

                //Logger.debug(`updateXrpBalance 3 trans = ${JSON.stringify(trans)}`);

                if (!transaction.destination_tag && transaction.destination_tag === "") {
                    //! do something
                    continue;
                }

                const desTag = transaction.destination_tag.toString();
                if (XRPAddress !== address) {
                    continue;
                }

                const { user_id } = await UserAddressRepository.getUserByTag(symbol, XRPAddress, desTag);
                if (user_id) {
                    const exeTime = transaction.executed_time;
                    const txnExists = await DepositRepository.checkExistsTxnId(txid, user_id, currency);
                    if (txnExists) {
                        //! do something
                        continue;
                    }

                    //? add deposit document
                    const depositData = {
                        amount: parseFloat(amount),
                        currency: currency,
                        payment_type: 'Ripple (XRP)',
                        payment_method: `${currency} Payment`,
                        reference_no: txid,
                        status: 'completed',
                        user_id,
                        move_status: 0,
                        block: exeTime,
                        currency_type: 'crypto'
                    };
                    await DepositRepository.create(depositData);

                    //? update user wallet
                    const balance = await UserWalletRepository.getUserBalance(userId, currency);
                    const updateBal = balance + amount;
                    await UserWalletRepository.updateUserWallet({ userId, currency, updateBal });

                    //! send sms
                    // sendSms = true;
                }
                else {
                    const txnWal = await adminWalTx(txid);
                    if (txnWal === 'true') {
                        const wltData = { txnid: txid, amount: parseFloat(amount), currency };
                        await WltDeposit.create(wltData);
                        // sendSms = true;
                    }
                }
            }
        }
        catch (error) {
            console.log(error.message);
        }
    }

    updateWeb3Balance = async () => {

    }

    updateWeb3TokenBalance = async () => {

    }

    updateTrc20Balance = async () => {

    }


    updateTrc20TokenBalance = async () => {

    }
}