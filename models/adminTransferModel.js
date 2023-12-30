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
        type: String
    },
    status_txt: {
        type: String
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { versionKey: false });

const AdminTransfer = mongoose.model('admin_transfer', adminTransferSchema, 'admin_transfer');

module.exports = AdminTransfer;