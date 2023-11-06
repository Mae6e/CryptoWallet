
const catchAsync = require('../utils/catchAsync');

const WalletAddressService = require('../services/walletAddressService');
const walletAddressService = new WalletAddressService();


class WalletAddressController {
    getAddress = catchAsync(async (req, res) => {
        const data = req.body;
        const response = await walletAddressService.getAddress(data);
        return res.status(response.statusCode).json(response);
    });
}

module.exports = WalletAddressController;