
const catchAsync = require('../utils/catchAsync');

const WalletAddressService = require('../services/walletAddressService');
const walletAddressService = new WalletAddressService();


class WalletAddressController {
    generateAddress = catchAsync(async (req, res) => {
        const data = req.body;
        const response = await walletAddressService.generateAddress(data);
        return res.status(response.statusCode).json(response);
    });
}

module.exports = WalletAddressController;