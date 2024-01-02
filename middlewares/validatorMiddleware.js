const { CryptoWalletApiKey } = require('../utils');
const Response = require('../utils/response');

exports.verifyApiKey = (req, res, next) => {
    const authKey = req.headers['authorization'];
    if (!authKey || authKey !== CryptoWalletApiKey) {
        const response = Response.forbid('Invalid Request');
        return res.status(response.statusCode).json(response);
    }
    next();
}