const mongoose = require('mongoose');

const tokenFeeSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    address: {
        type: String,
        required: true
    },
    currency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'currencies',
        required: true,
        index: true
    },
    network: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'network',
        required: true,
        index: true
    },
    fees: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    txid: {
        type: String,
        required: true
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { versionKey: false });

const TokenFeeModel = mongoose.model('token_fees', tokenFeeSchema, 'token_fees');

module.exports = TokenFeeModel;