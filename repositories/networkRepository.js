
//? models
const Network = require('../models/networkModel');

exports.getNetworkByName = async (name) => {
    return await Network.findOne({ name: { $regex: name } }, { name: 1, siteWallet: 1 });
}


