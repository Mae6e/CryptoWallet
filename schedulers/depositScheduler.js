//? service
const DepositService = require('../services/depositService');
const depositService = new DepositService();
const UtilityService = require('../services/utilityService');
const utilityService = new UtilityService();

//const { GethNetworkProviders } = require('../utils/constants');


exports.updateWallets = async (network) => {
    try {
        console.log(`run scheduler for ${network.type}`);

        const initialBlockIndex = network.initialBlockIndex;
        const endBlockIndex = network.lastOnlineBlockNumber;

        // console.log('scheduler-initialBlockIndex: ', initialBlockIndex);
        // console.log('scheduler-endBlockIndex: ', endBlockIndex);

        // if (!GethNetworkProviders.includes(network.type)) {
        const result = await utilityService.getTransactionsByNetwork({
            symbol: network.symbol,
            networkType: network.type,
            initialBlockIndex,
            endBlockIndex,
            sitePublicKey: network.sitePublicKey
        });

        if (!result) {
            console.log('can not find result ...');
        } else {
            //? deposit
            await depositService.updateWalletBalance({
                symbol: network.symbol,
                networkType: network.type,
                initialBlockIndex,
                endBlockIndex,
                recipientTransactions: result.recipientTransactions,
                adminTransactions: result.adminTransactions,
                hasUpdatedBlockIndex: true
            });
        }
        //  }
        // else {
        //     for (let i = initialBlockIndex; i <= endBlockIndex; i++) {
        //         const result = await utilityService.getTransactionsByNetwork({
        //             symbol: network.symbol,
        //             networkType: network.type,
        //             initialBlockIndex: i,
        //             sitePublicKey: network.sitePublicKey
        //         });

        //         if (!result) {
        //             console.log('can not find result ...');
        //         } else {
        //             //? deposit
        //             await depositService.updateWalletBalance({
        //                 symbol: network.symbol,
        //                 networkType: network.type,
        //                 initialBlockIndex: i,
        //                 recipientTransactions: result.recipientTransactions,
        //                 adminTransactions: result.adminTransactions,
        //                 hasUpdatedBlockIndex: true
        //             });
        //         }
        //     }
        // }

        //console.log(`complete scheduler for ${network.type}`);
    }
    catch (error) {
        console.log("error scheduler: ");
        console.log(error);
    }
}