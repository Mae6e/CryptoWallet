
//? models
const UserAddress = require('../models/userAddressModel');

exports.countOfTagByCurrency = async ({ currency, tag }) => {
    return await UserAddress
        .countDocuments({ address: { $elemMatch: { tag, currency } } });
}

exports.getUserByTag = async ({ currency, address, tag }) => {
    return await UserAddress
        .find({ address: { $elemMatch: { value: address, currency, tag } } }, { user_id: 1 });
}



