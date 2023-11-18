const WltDeposits = require('../models/wltDepositsModel');

//? check if txid already exists
exports.checkExistsTxnId = async (txid) => {
    return await WltDeposits.exists({ txnid: txid });
}

//? create 
exports.create = async (model) => {
    return await WltDeposits.create(model);
}