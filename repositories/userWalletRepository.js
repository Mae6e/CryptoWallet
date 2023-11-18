
const UserWallet = require('../models/userWalletModel');

exports.getUserBalance = async ({ user, currency }) => {
    return await UserWallet.findOne({ user_id: user }, { [currency]: 1 });
}

exports.updateUserWallet = async ({ user, currency, amount }) => {
    return await UserWallet.updateOne({ user_id: user }, { $set: { [currency]: parseFloat(amount), updated_at: new Date() } });
}
