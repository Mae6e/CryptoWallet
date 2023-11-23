
//? models
const Network = require('../models/networkModel');

exports.getNetworkByType = async (type) => {
    return await Network.findOne({ type }, { type: 1, siteWallet: 1 });
}

exports.updateLastStatusOfNetwork = async (id, lastBlockNumber, lastExecutedAt) => {
    try {
        return await Network.findOneAndUpdate({ _id: id }, {
            $set: {
                lastExecutedAt,
                lastBlockNumber
            }
        }, { new: true });
    }
    catch (error) {
        console.log(error.message);
    }
}

