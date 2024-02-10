const mongoose = require('mongoose');
const { DepositWorkerStatus } = require('../utils/constants');

const depositWorkerSchema = new mongoose.Schema({
    networkType: {
        type: Number,
        index: true,
        required: true
    },
    networkSymbol: {
        type: String,
        index: true,
        required: true
    },
    initialBlockIndex: {
        type: Number,
        required: true
    },
    currentBlockIndex: {
        type: Number,
        required: true,
        default: function () { return this.initialBlockIndex }
    },
    targetBlockIndex: {
        type: Number,
        required: true
    },
    endBlockIndex: {
        type: Number,
        required: true
    },
    status: {
        type: Number,
        required: true,
        enum: Object.values(DepositWorkerStatus),
        default: DepositWorkerStatus.PENDING
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date }
}, { versionKey: false });

const DepositWorker = mongoose.model('deposit_worker', depositWorkerSchema, 'deposit_worker');

module.exports = DepositWorker;