
//? models
const Network = require('../models/networkModel');
const { NetworkStatus } = require('../utils/constants');

//? get network by type
exports.getNetworkByType = async (type) => {
    return await Network.findOne({ type },
        { type: 1, siteWallet: 1, generalWallet: 1, status: 1, symbol: 1, lastBlockNumber: 1 });
}

//? get network by id
exports.getNetworkById = async (id) => {
    return await Network.findById(id);
}

//? get network by id
exports.getAllNetworkByType = async (types) => {
    return await Network.find({
        type: { $in: types }
    }, { symbol: 1, type: 1, lastBlockNumber: 1, siteWallet: 1, generalWallet: 1 });
}


//? update last blocNnumber
exports.updateLastStatusOfNetwork = async (id, lastBlockNumber) => {
    try {
        return await Network.findOneAndUpdate({ _id: id }, {
            $set: {
                lastExecutedAt: new Date(),
                lastBlockNumber
            }
        }, { new: true });
    }
    catch (error) {
        console.log(error.message);
    }
}


//? get generalWallet
exports.getGeneralWalletByType = async (type) => {
    return await Network.findOne({ type }, { type: 1, generalWallet: 1 });
}

//? update generalWallet
exports.updateGeneralWallet = async ({ type, publicKey, privateKey }) => {
    try {
        return await Network.findOneAndUpdate({ type }, {
            $set: {
                generalWallet: {
                    privateKey,
                    publicKey,
                    updated_at: new Date()
                }
            }
        }, { new: true });
    }
    catch (error) {
        console.log(error.message);
        return false;
    }
}

//? get all lastBlockNumber
exports.getAllNetworkLastBlockNumber = async () => {
    return await Network.find({ status: NetworkStatus.ACTIVE }, { symbol: 1, type: 1, lastBlockNumber: 1, siteWallet: 1 });
}

