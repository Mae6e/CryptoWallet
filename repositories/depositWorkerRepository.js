const DepositWorker = require('../models/depositWorkerModel');
const { DepositWorkerStatus } = require('../utils/constants');

const { PendingTaskExecuterNumber } = require('../utils');

//? create worker
exports.create = async (data) => {
    return await DepositWorker.create(data);
}

exports.insertMany = async (data) => {
    return await DepositWorker.insertMany(data);
}

//? get all pendig workers
exports.getAllPendingWorker = async (networkType) => {
    return await DepositWorker.find({ networkType, status: DepositWorkerStatus.PENDING })
        .limit(PendingTaskExecuterNumber).lean();
}

//? get untrack worker
exports.getUntrackWorker = async (networkType) => {
    return await DepositWorker.findOne({ networkType }).sort({ _id: -1 });
}

//? update worker
exports.updateCurrentBlockById = async (id, currentBlockIndex, status) => {
    return await DepositWorker.findByIdAndUpdate(id, { currentBlockIndex, status, updated_at: new Date() },
        { new: true });
}
