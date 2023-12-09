const mongoose = require('mongoose');

let depositSchema = new mongoose.Schema({
  "user_id": { type: mongoose.Schema.Types.ObjectId, ref: 'user_info', index: true },
  "amount": Number,
  "reference_no": { type: String, index: true },
  "payment_method": { type: String, index: true },
  "payment_type": { type: String, default: '', index: true },
  "currency": { type: String, index: true },
  "currency_type": { type: String, index: true },
  "status": { type: String, index: true },
  "ip_address": String,
  "dep_bank_info": { type: String },
  "address_info": { type: String },
  "proof": { type: String },
  "reason": { type: String },
  "total": { type: Number, default: 0 },
  "fees": { type: Number, default: 0 },
  "fee_per": { type: Number, default: 0 },
  "move_status": { type: Number, default: 0 },
  "admin_id": { type: String },
  "with_otp": { type: String, index: true },
  "block": Number,
  "executedAt": Date,
  "created_at": { type: Date, default: Date.now },
  "updated_at": { type: Date, default: Date.now }
}, { "versionKey": false });

module.exports = mongoose.model('deposit', depositSchema, 'deposit');