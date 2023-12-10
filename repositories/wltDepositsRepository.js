const WltDeposits = require('../models/wltDepositsModel');

//? check if txid already exists
exports.checkExistsTxnId = async (txid, amount) => {
    return await WltDeposits.exists({ txnid: txid, amount });
}

//? create 
exports.create = async (model) => {
    return await WltDeposits.create(model);
}