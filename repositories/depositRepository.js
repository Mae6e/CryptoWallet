
const Deposit = require('../models/depositModel');

//? check if txid already exists
exports.checkExistsTxnId = async ({ txid, user, currency }) => {
    return await Deposit.exists({ reference_no: txid, user_id: user, currency: currency });
}

exports.create = async (model) => {
    return await Deposit.create(model);
}