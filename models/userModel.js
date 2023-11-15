const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let usersSchema = new mongoose.Schema({
  "username": { type: String, index: true },
  "firstname": String,
  "lastname": String,
  "XgLobEr_VaLUe": { type: String, index: true },
  "protect_key": { type: String, index: true },
  "dob": String,
  "phone": String,
  "country_code": { type: String, default: '' },
  "alpha_code": { type: String, default: '' },
  "address": String,
  "city": { type: String, default: '' },
  "state": { type: String, default: '' },
  "country": { type: String, default: '' },
  "nationality": { type: String, default: '' },
  "zipcode": String,
  "dealr_key": { type: String, index: true },
  "status": { type: Number, default: 0 },
  "profile_pic": { type: String, default: '' },
  "tfa_status": { type: Number, default: 0 },
  "tfa_code": String,
  "tfa_url": String,
  "kyc_status": { type: Number, default: 0 },
  "id_number": { type: String, default: '' },
  "id_proof": { type: String, default: '' },
  "id_proof1": { type: String, default: '' },
  "id_reject": String,
  "id_status": { type: Number, default: 0 },
  "addr_proof": { type: String, default: '' },
  "addr_reject": String,
  "addr_status": { type: Number, default: 0 },
  "selfie_proof": { type: String, default: '' },
  "selfie_reject": String,
  "selfie_status": { type: Number, default: 0 },
  "pro_status": { type: Number, default: 0 },
  "notif_login": { type: Number, default: 0 },
  "notif_tfa": { type: Number, default: 0 },
  "notif_pass": { type: Number, default: 0 },
  "otp_status": { type: Number, default: 0 },
  "mobile_otp": { type: String, default: '' },
  "email_otp": { type: String, default: '' },
  "refer_id": String, //! SKIP: previous referral method
  "referrer_id": { type: String, default: '' }, //! SKIP: previous referral method
  "xid": { type: String, default: '' },
  "bank_status": { type: Number, default: 0 },
  "refer_user": { type: mongoose.Schema.Types.ObjectId, ref: 'user_info', index: true }, //! SKIP: previous referral method
  "forgot_code": String,
  "created_at": { type: Date, default: Date.now },
  "updated_at": { type: Date, default: Date.now },
  "user_fav": [],
  "fav_pair": [],
  "fav_curr": [],
  "secretkey": [],
  "ip_address": String,
  "with_pass": { type: String, default: '' },
  "withdraw_otp": String,
  "allow_withdraw": { type: Number, default: 1 },
  "allow_trade": { type: Number, default: 1 },
  userID: {
    type: String,
    min: [0, 'The userID must be above 0'],
    max: [10, 'The userID must be blew 10'],
    unique: true
  },
  userReferralReward: { type: mongoose.Schema.ObjectId, ref: 'user_referral_reward', index: true }
}, { "versionKey": false });

module.exports = mongoose.model('user_info', usersSchema, 'user_info');