
//? models
const Currencies = require('../models/currenciesModel');

exports.getCurrencyBySymbol = async (symbol, network) => {
    return await Currencies.findOne({ symbol, "networks.network": network },
        { contractAddress: 1, decimalPoint: 1 });
}


