
//? models
const UserAddress = require('../models/userAddressModel');

exports.countOfTagByCurrency = async ({ currency, tag }) => {
    return await UserAddress
        .countDocuments({ address: { $elemMatch: { tag, currency } } });
}

exports.getUserByTag = async (currency, address, tag) => {
    return await UserAddress
        .findOne({ address: { $elemMatch: { value: address, currency, tag } } }, { user_id: 1 });
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



