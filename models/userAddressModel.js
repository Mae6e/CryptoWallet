const mongoose = require('mongoose');
const { WalletProvider } = require('../utils/constants');

let addressSchema = new mongoose.Schema({
	"user_id": { type: mongoose.Schema.Types.ObjectId, ref: 'user_info', index: true },
	"address": [{
		"network": { type: mongoose.Schema.Types.ObjectId, ref: 'network', index: true },
		"value": { type: String },
		"tag": { type: String },
		"secret": { type: String },
		"public": { type: String },
		"walletProvider": { type: Number, enum: Object.values(WalletProvider), default: WalletProvider.Other }
	}],
	"created_at": { type: Date, default: Date.now }
}, { "versionKey": false });

module.exports = mongoose.model('user_address', addressSchema, 'user_address');