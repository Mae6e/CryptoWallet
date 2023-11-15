const mongoose = require('mongoose');

let walletSchema = new mongoose.Schema({
  "user_id": { type: mongoose.Schema.Types.ObjectId, ref: 'user_info', index: true },
  "Ref_USD": { type: Number, default: 0.00 }, //! SKIP: previous referral method
  "clear_bal": { type: Number, default: 0.00 }, //! SKIP: previous referral method
  "created_at": { type: Date, default: Date.now },
  "updated_at": { type: Date, default: Date.now, index: true }
}, { "versionKey": false, strict: false });

module.exports = mongoose.model('user_wallet', walletSchema, 'user_wallet');