
//? models
const UserAddress = require('../models/userAddressModel');
const { WalletProvider } = require('../utils/constants');

exports.existsTagByNetwork = async ({ network, tag }) => {
    return await UserAddress
        .exists({ address: { $elemMatch: { tag, network } } });
}

exports.getUserAddressByTag = async (network, tag) => {
    return await UserAddress
        .findOne({ address: { $elemMatch: { network, tag } } }, { user_id: 1 });
}

exports.getUserAddressesByTags = async (network, tags) => {
    return await UserAddress.find({
        address: {
            $elemMatch: {
                tag: { $in: tags },
                network
            }
        }
    }).select('user_id address').lean();
}


exports.getWeb3UserAddressesByValue = async (addresses) => {
    return await UserAddress.find({
        address: {
            $elemMatch: {
                value: { $in: addresses },
                walletProvider: WalletProvider.Geth
            }
        }
    }).select('user_id address').lean();
}


exports.getUserAddressesByUsers = async ({ network, users }) => {
    return await UserAddress.find({
        user_id: { $in: users },
        address: {
            $elemMatch: {
                network
            }
        }
    }).select('user_id address').lean();
}



exports.getWeb3UserAddressesByUsers = async ({ users }) => {
    return await UserAddress.find({
        user_id: { $in: users },
        address: {
            $elemMatch: {
                walletProvider: WalletProvider.Geth
            }
        }
    }).select('user_id address').lean();
}



