const express = require('express');
const router = express.Router();

const WalletAddressController = require('../controllers/walletAddressController');
const walletAddressController = new WalletAddressController();

//!
const DepositController = require('../controllers/depositController');
const depositController = new DepositController();

router.post('/address', walletAddressController.generateAddress);
router.post('/site/balance', walletAddressController.getSiteWalletBalance);
router.get('/test', depositController.updateWalletBalance);

module.exports = router;

