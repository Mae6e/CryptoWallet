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
        if (!currency) {
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
            //Logger.debug(`updateXrpBalance 1 => ${blockNumber} url ${url}`);


            const response = await axios.get(url);
            if (!response || !response.data) {
                return;
            }

            const { result, count, payments } = response.data;
            if (result !== 'success' || count === 0) {
                //! do someting
                //Logger.error(`UpdateXrpBalance problem => ${JSON.stringify(res)}`);
                return;
            }

            if (!payments || payments.length === 0) {
                //! do something
                return;
            }

            // Logger.debug(`updateXrpBalance 2 success result count ${res.count}`);

            for (const transaction of payments) {

                const address = transaction.destination;
                //Logger.debug(`updateXrpBalance 3 trans = ${JSON.stringify(trans)}`);

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
            }
        }
        catch (error) {
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