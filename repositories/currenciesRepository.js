
const { CurrencyType } = require('../utils/constants');

//? models
const Currencies = require('../models/currenciesModel');

exports.getCurrencyBySymbol = async (symbol, network) => {
    return await Currencies.findOne({ symbol, "networks.network": network },
        {
            "networks.network": 1,
            "networks.contractAddress": 1,
            "networks.decimalPoint": 1,
            "networks.lastExecutedAt": 1,
            "networks.siteWallet": 1,
            type: 1,
            symbol: 1
        })
        .populate('networks.network');
}


exports.getAllTokensByNetwork = async (network) => {
    return await Currencies.find({
        $or: [{ type: CurrencyType.TOKEN }, { type: CurrencyType.COIN_OR_TOKEN }],
        networks: {
            $elemMatch: {
                network: network,
                contractAddress: { $exists: true, $ne: '' }
            }
        }
    },
        {
            symbol: 1,
            "networks.contractAddress": 1,
            "networks.network": 1,
            "networks.decimalPoint": 1
        })
        .populate('networks.network');
}




