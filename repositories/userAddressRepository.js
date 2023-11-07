
//? models
const UserAddress = require('../models/userAddressModel');

exports.countOfTagByCurrency = async ({ currency, tag }) => {
    return await UserAddress.countDocuments({ address: { $elemMatch: { tag, currency } } });
}


