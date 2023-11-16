const mongoose = require('mongoose');

let wltDeposits = new mongoose.Schema({
  "amount"        : String,
  "txnid"         : String,
  "currency"      : String,
  "created_at"    : { type:Date, default:Date.now },
}, {"versionKey" : false});

module.exports = mongoose.model('wltDeposits', wltDeposits, 'wltDeposits');