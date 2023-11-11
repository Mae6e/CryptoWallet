
//? models
const Currencies = require('../models/currenciesModel');

exports.getCurrencyBySymbol = async (symbol, network) => {
    return await Currencies.findOne({ symbol, "networks.network": network },
        { "networks.contractAddress": 1, "networks.decimalPoint": 1, type: 1 });
}


