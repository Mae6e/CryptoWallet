

//? models
const TokenFee = require('../models/tokenFeeModel');
const { TokenFeeStatus } = require('../utils/constants');


//? find all pay-for-transfer tokens by network
exports.existsActiveTokenFeesByNetwork = async ({ network, user_id }) => {
    return await TokenFee.exists({
        user_id,
        network, status: TokenFeeStatus.ACTIVE
    });
}

//? find all pay-for-transfer tokens by currency
exports.existsActiveTokenFeesByCurrency = async ({ network, currency, user_id }) => {
    return await TokenFee.exists({
        user_id,
        network, currency,
        status: TokenFeeStatus.ACTIVE
    });
}


//? deactive all by currency
exports.deactiveTokenFeesByCurrency = async ({ network, currency, user_id }) => {
    return await TokenFee.updateMany(
        { user_id, network, currency, status: TokenFeeStatus.ACTIVE },
        { status: TokenFeeStatus.DEACTIVE, updated_at: new Date() });
}

//? deactive all by network
exports.deactiveTokenFeesByNetwork = async ({ network, user_id }) => {
    return await TokenFee.updateMany(
        { user_id, network, status: TokenFeeStatus.ACTIVE },
        { status: TokenFeeStatus.DEACTIVE, updated_at: new Date() });
}


//? create tokenFee
exports.create = async (model) => {
    await TokenFee.create(model);
}

//? get latest pay for token
exports.getLatestActiveFeeMove = async ({ user_id, address, network, currency }) => {
    return await TokenFee.findOne(
        {
            user_id,
            address,
            network,
            currency,
            status: TokenFeeStatus.ACTIVE
        }).sort({ updated_at: -1 });
}









