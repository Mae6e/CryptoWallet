const express = require('express');
const router = express.Router();
const validator = require('../middlewares/validatorMiddleware');

const WalletAddressController = require('../controllers/walletAddressController');
const walletAddressController = new WalletAddressController();
// const DepositController = require('../controllers/depositController');
// const depositController = new DepositController();

router.post('/address', validator.verifyApiKey, walletAddressController.generateAddress);
router.post('/site/balance', validator.verifyApiKey, walletAddressController.getSiteWalletBalance);
router.post('/address/general', validator.verifyApiKey, walletAddressController.getGeneralWallet);
// router.post('/deposit', depositController.updateWalletBalance);

module.exports = router;

