
const catchAsync = require('../utils/catchAsync');

const DepositService = require('../services/depositService');
const depositService = new DepositService();


class DepositController {
    updateWalletBalance = catchAsync(async (req, res) => {
        const data = req.body;
        const response = await depositService.updateWalletBalance(data);
        return res.status(response.statusCode).json(response);
    });
}

module.exports = DepositController;