const mongoose = require('mongoose');

let wltDeposits = new mongoose.Schema({
  "amount": Number,
  "txnid": String,
  "currency": String,
  "created_at": { type: Date, default: Date.now },
}, { "versionKey": false });

module.exports = mongoose.model('wlt_deposits', wltDeposits, 'wlt_deposits');