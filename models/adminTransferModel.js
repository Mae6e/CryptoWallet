const mongoose = require('mongoose');

const adminTransferSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    txid: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    status_txt: {
        type: String,
        required: true
    }
}, { versionKey: false });

const AdminTransfer = mongoose.model('admin_transfer', adminTransferSchema, 'admin_transfer');

module.exports = AdminTransfer;