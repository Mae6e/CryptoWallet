
const axios = require('axios');

//? repositories
const NetworkRepository = require('../repositories/networkRepository');
const UserAddressRepository = require('../repositories/userAddressRepository');

//? utils
const { XRPAddress } = require('../utils');
const { DepositState, CryptoType } = require('../utils/constants');

//? services
const UtilityService = require('./utilityService');
const utilityService = new UtilityService();

//? logger
const logger = require('../logger')(module);

class RippleService {

    //? main function for recognize for deposit
    updateRippleWalletBalances = async (currency) => {
        try {
            //? currency info
            const { networks, symbol } = currency;
            const { lastblockNumber, network } = networks[0].network;
            const lastExecutedAt = networks[0].network.lastExecutedAt;
            const currentBlockDate = (lastExecutedAt ? lastExecutedAt.toISOString() : '2022-09-12T00:00:00Z');
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
                await this.processRippleTransaction({ transaction, symbol, network, lastblockNumber, currentBlockDate });
            }
        } catch (error) {
            logger.error(`updateRippleWalletBalances|exception`, { currency }, error);
        }
    }

    //? check transactions for users and admin
    processRippleTransaction = async ({ transaction, symbol, network, lastblockNumber, currentBlockDate }) => {
        const { destination, destination_tag,
            delivered_amount, tx_hash, executed_time } = transaction;

        logger.debug(`processRippleTransaction|transactions`, { currentBlockDate, transaction });
        if (!destination_tag || destination_tag === "" || XRPAddress !== destination) {
            return;
        }

        const userAddressDocument = await UserAddressRepository.getUserAddressByTag(symbol, XRPAddress, destination_tag);
        if (userAddressDocument) {
            const data = {
                txid: tx_hash,
                user_id: userAddressDocument.user_id,
                currency: symbol,
                amount: delivered_amount,
                payment_type: 'Ripple (XRP)',
                status: DepositState.COMPLETED,
                currency_type: CryptoType.CRYPTO,
                exeTime: executed_time
            };
            await utilityService.updateUserWallet(data);
        } else {
            const data = { txid, amount, currency: symbol };
            await utilityService.updateAdminWallet(data);
        }

        //? update the block and date of executed
        await NetworkRepository.updateLastStatusOfNetwork(network, lastblockNumber, exeTime);
        logger.info(`processRippleTransaction|changeBlockState`, { network, executed_time });
    }
}

module.exports = RippleService;