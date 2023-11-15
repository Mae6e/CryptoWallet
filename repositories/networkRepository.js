
//? models
const Network = require('../models/networkModel');

exports.getNetworkByType = async (type) => {
    return await Network.findOne({ type }, { type: 1, siteWallet: 1 });
}


