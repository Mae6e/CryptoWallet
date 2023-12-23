
const Deposit = require('../models/depositModel');
const { DepositMoveStatus } = require('../utils/constants');

//? check if txid already exists
exports.checkExistsTxnId = async (txid, user, currency, amount) => {
    return await Deposit.exists({ reference_no: txid, user_id: user, currency, amount });
}

//? create
exports.create = async (model) => {
    return await Deposit.create(model);
}

//? get all new deposit
exports.getAllDepositsByStatus = async ({ currency, move_status, payment_type }) => {
    return await Deposit.aggregate([
        { $match: { currency, move_status, payment_type } },
        { $group: { _id: '$user_id', address: { $first: '$address_info' } } },
        { $project: { _id: 0, user_id: '$_id', address: 1 } }
    ]);
}

//? update deposit by status
exports.UpdateDepositsByStatus = async ({ currency, address_info }) => {
    await Deposit.updateMany({
        currency, move_status: DepositMoveStatus.NOT_MOVED, address_info
    }, { $set: { move_status: DepositMoveStatus.MOVED, updated_at: new Date() } })
}

//? update deposit to complete status
exports.UpdateDepositsToCompeleted = async ({ currency, address_info }) => {
    await Deposit.updateMany({
        currency, address_info
    }, { $set: { move_status: DepositMoveStatus.COMPLETED, updated_at: new Date() } })
}