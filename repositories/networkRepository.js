
//? models
const Network = require('../models/networkModel');

//? get network
exports.getNetworkByType = async (type) => {
    return await Network.findOne({ type }, { type: 1, siteWallet: 1, generalWallet: 1 });
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

