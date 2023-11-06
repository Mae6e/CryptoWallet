const mongoose = require('mongoose');

let addressSchema = new mongoose.Schema({
  "user_id"		   : { type:mongoose.Schema.Types.ObjectId, ref:'user_info', index:true },
  "address"      : [{
		"currency": { type: String }, 
		"value" 	: { type: String },
		"tag" 		: { type: String, default: "" },
		"secret" 	: { type: String, default: "" },
		"public" 	: { type: String, default: "" },
	}],
  "created_at" 	 : { type: Date, default: Date.now }
}, {"versionKey" : false});

module.exports = mongoose.model('user_address', addressSchema, 'user_address');