
const axios = require('axios');

const NetworkRepository = require('../repositories/networkRepository');
const CurrenciesRepository = require('../repositories/currenciesRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');
const UserWalletRepository = require('../repositories/userWalletRepository');
const DepositRepository = require('../repositories/depositRepository');
const WltDepositsRepository = require('../repositories/wltDepositsRepository');

const Response = require('../utils/response');

//? utils
const {
    XRPAddress,
    NetworkSymbol } = require('../utils');

const { CurrencyType, NetworkType, DepositState, CryptoType } = require('../utils/constants');


class DepositService {

    updateWalletBalance = async (data) => {

        let { symbol, networkType } = data;
        if (!symbol || !networkType) {
            return Response.warn('Please Enter Network and Currency Information');
        }

        console.log(data);

        const network = await NetworkRepository.getNetworkByType(networkType);
        if (!network) {
            return Response.warn('Invalid Network');
        }

        const currency = await CurrenciesRepository.getCurrencyBySymbol(symbol, network._id);
        if (!currency) {
            return Response.warn('Invalid Currency');
        }

        console.log(currency);

        let web3NetworkType;
        // if (networkType) {
        //     web3NetworkType = this.getWeb3Network(networkType);
        // }

        if (network.type == NetworkType.RIPPLE) {
            if (currency.type === CurrencyType.COIIN) {
                //! updateRippleWalletBalance
                this.updateRippleWalletBalances(currency.networks[0].lastBlockNumber);
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

    //? XRP-Deposit
    updateRippleWalletBalances = async (lastblockNumber) => {
        try {
            console.log(lastblockNumber);
            const currency = NetworkSymbol.XRP;
            const blockNumber = lastblockNumber > 0 ? lastblockNumber : "2022-09-12T00:00:00Z";
            const url = `${process.env.EXPLORER_RIPPLE.replace('ADDRESS', XRPAddress)}${blockNumber}`;
            //Logger.debug(`updateXrpBalance 1 => ${blockNumber} url ${url}`);

            console.log(url);

            const response = await axios.get(url);
            console.log("herererere");
            console.log(response);

            // const res = JSON.parse(response);
            // console.log(response);

            if (!response || !response.data) {
                return;
            }

            const { result, count, payments } = response.data;

            console.log(result);
            console.log(payments.length);

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
                    continue;
                }

                const desTag = transaction.destination_tag.toString();
                if (XRPAddress !== address) {
                    continue;
                }

                const { user_id } = await UserAddressRepository.getUserByTag(symbol, XRPAddress, desTag);
                if (user_id) {
                    const exeTime = transaction.executed_time;
                    const data =
                    {
                        txid,
                        user_id,
                        currency,
                        amount,
                        payment_type: 'Ripple (XRP)',
                        status: DepositState.COMPLETED,
                        currency_type: CryptoType.CRYPTO,
                        exeTime
                    };
                    await this.updateUserWallet(data);
                }
                else {
                    const data = { txnid: txid, amount, currency };
                    await this.updateUserWallet(data);
                }
            }
        }
        catch (error) {
            console.log("error");

            console.log(error.message);
        }
    }


    //? add user Deposit, update userWallet
    updateUserWallet = async (data) => {
        const { txid, user_id, currency, amount, payment_type, status, currency_type, exeTime } = data;
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
            block: exeTime,
            currency_type
        };
        await DepositRepository.create(depositData);

        //? update user wallet
        const balance = await UserWalletRepository.getUserBalance(user_id, currency);
        const updateBal = balance + amount;
        await UserWalletRepository.updateUserWallet({ user_id, currency, updateBal });

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