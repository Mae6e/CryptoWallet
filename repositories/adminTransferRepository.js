
const { AdminTransferStatus, AdminTransferTxtStatus } = require('../utils/constants');

//? models
const AdminTransfer = require('../models/adminTransferModel');

exports.create = async (data) => {
    const { userId, currency, account, balance, transaction } = data;
    const model = {
        user_id: userId,
        currency,
        address: account,
        amount: balance,
        txid: transaction,
        status: AdminTransferStatus.PENDING,
        status_txt: AdminTransferTxtStatus.PENDING,
    };
    return await AdminTransfer.create(model);
}


exports.pendingTransactions = async (currency) => {
    return await AdminTransfer.find(
        { currency, status: AdminTransferStatus.PENDING },
        { txid: 1, status: 1, status_txt: 1 }).lean();
}









