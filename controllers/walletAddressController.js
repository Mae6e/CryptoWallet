
const catchAsync = require('../utils/catchAsync');

const WalletAddressService = require('../services/walletAddressService');
const walletAddressService = new WalletAddressService();


class WalletAddressController {
    generateAddress = catchAsync(async (req, res) => {
        const data = req.body;
        const response = await walletAddressService.generateAddress(data);
        return res.json(response);
    });

    getSiteWalletBalance = catchAsync(async (req, res) => {
        const data = req.body;
        const response = await walletAddressService.getSiteWalletBalance(data);
        return res.json(response);
    });

    getGeneralWallet = catchAsync(async (req, res) => {
        const data = req.body;
        const response = await walletAddressService.getGeneralWalletAddress(data.networkType);
        return res.json(response);
    });

}

module.exports = WalletAddressController;