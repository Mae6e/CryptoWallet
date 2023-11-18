
//? models
const Currencies = require('../models/currenciesModel');

exports.getCurrencyBySymbol = async (symbol, network) => {
    return await Currencies.findOne({ symbol, "networks.network": network },
        {
            "networks.network": 1,
            "networks.contractAddress": 1,
            "networks.decimalPoint": 1,
            "networks.lastBlockNumber": 1,
            "networks.lastExecutedAt": 1,
            type: 1,
            symbol: 1
        });
}


exports.updateLastStatusOfCurrency = async (id, network, lastBlockNumber, lastExecutedAt) => {
    try {
        return await Currencies.findOneAndUpdate({ _id: id, "networks.network": network }, {
            $set: {
                "networks.$.lastExecutedAt": lastExecutedAt,
                "networks.$.lastBlockNumber": lastBlockNumber
            }
        }, { new: true });
    }
    catch (error) {
        console.log(error.message);
    }
}



