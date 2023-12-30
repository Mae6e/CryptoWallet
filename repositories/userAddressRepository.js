
//? models
const UserAddress = require('../models/userAddressModel');

exports.countOfTagByCurrency = async ({ currency, tag }) => {
    return await UserAddress
        .countDocuments({ address: { $elemMatch: { tag, currency } } });
}

exports.getUserAddressByTag = async (currency, tag) => {
    return await UserAddress
        .findOne({ address: { $elemMatch: { currency, tag } } }, { user_id: 1 });
}

exports.getCoinAddressesByTagAndCurrency = async (currency, tags) => {
    return await UserAddress.find({
        address: {
            $elemMatch: {
                tag: { $in: tags },
                currency: currency
            }
        }
    }).select('user_id address').lean();
}


exports.getCoinAddressesByValueAndCurrency = async (currency, addresses) => {
    return await UserAddress.find({
        address: {
            $elemMatch: {
                value: { $in: addresses },
                currency: currency
            }
        }
    }).select('user_id address').lean();
}


exports.getCoinAddressesByUsers = async ({ currency, users }) => {
    return await UserAddress.find({
        currency,
        user_id: { $in: users }
    }).select('user_id address').lean();
}



