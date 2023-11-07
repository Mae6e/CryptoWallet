const express = require('express');
const router = express.Router();

const WalletAddressController = require('../controllers/walletAddressController');
const walletAddressController = new WalletAddressController();

router.post('/address', walletAddressController.generateAddress);

module.exports = router;

