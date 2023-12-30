
const { AdminTransferStatus, AdminTransferTxtStatus } = require('../utils/constants');

//? models
const AdminTransfer = require('../models/adminTransferModel');

exports.create = async (data) => {
    const { user_id, currency, address, amount, transaction, status, status_txt } = data;
    const model = {
        user_id,
        currency,
        address,
        amount,
        txid: transaction,
        status,
        status_txt,
    };
    return await AdminTransfer.create(model);
}


exports.pendingTransactions = async (currency) => {
    return await AdminTransfer.find(
        { currency, status: AdminTransferStatus.PENDING },
        { txid: 1, status: 1, status_txt: 1 }).lean();
}









