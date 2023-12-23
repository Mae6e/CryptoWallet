

//? models
const TokenFeeModel = require('../models/tokenFeeModel');
const { TokenFeeStatus } = require('../utils/constants');


//? find all pay-for-transfer tokens by network
exports.existsActiveTokenFeesByNetwork = async ({ network, user_id }) => {
    return await TokenFeeModel.exists({
        user_id,
        network, status: TokenFeeStatus.ACTIVE
    });
}

//? find all pay-for-transfer tokens by currency
exports.existsActiveTokenFeesByCurrency = async ({ network, currency, user_id }) => {
    return await TokenFeeModel.exists({
        user_id,
        network, currency,
        status: TokenFeeStatus.ACTIVE
    });
}


//? deactive all by currency
exports.deactiveTokenFeesByCurrency = async ({ network, currency, userId }) => {
    return await TokenFeeModel.updateMany({
        user_id: userId, network, currency, status: TokenFeeStatus.DEACTIVE
    });
}

//? deactive all by network
exports.deactiveTokenFeesByNetwork = async ({ network, userId }) => {
    return await TokenFeeModel.updateMany({
        user_id: userId, network, status: TokenFeeStatus.DEACTIVE
    });
}


//? create tokenFee
exports.create = async (model) => {
    await TokenFee.Create(model);
}

//? get latest pay for token
getLatestTrxActiveFeeMove = async ({ user_id, address, network, currency }) => {
    return await TokenFee.findOne(
        {
            user_id,
            address,
            network,
            currency,
            status: TokenFeeStatus.ACTIVE
        }).sort({ updated_at: -1 });
}









