
//? models
const Network = require('../models/networkModel');

exports.getNetworkByType = async (type) => {
    return await Network.findOne({ type }, { type: 1, siteWallet: 1 });
}

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

