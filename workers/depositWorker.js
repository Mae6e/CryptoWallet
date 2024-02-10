const workerpool = require('workerpool');

const UtilityService = require('../services/utilityService');
const utilityService = new UtilityService();

const trackBlocks = async (params) => {
    return await utilityService.getTransactionsByNetwork({
        symbol: params.networkSymbol,
        networkType: params.networkType,
        initialBlockIndex: params.currentBlockIndex,
        endBlockIndex: params.targetBlockIndex,
        sitePublicKey: params.sitePublicKey
    });
}

//? create a worker and register public functions
workerpool.worker({
    trackBlocks
});