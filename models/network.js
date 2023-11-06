const mongoose = require('mongoose');
const { NetworkStatus } = require('../utils/constants');

const networkSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'The network must be have a name'],
        minLength: [2, 'The name must be above 2'],
        maxLength: [50, 'The name must be blew 50'],
        unique: true
    },
    symbol: {
        type: String,
        required: [true, 'The network must be have a symbol'],
        minLength: [2, 'The symbol must be above 2'],
        maxLength: [20, 'The symbol must be blew 20'],
        uppercase: true
    },
    status: {
        type: Number,
        required: [true, 'The network must be have a status'],
        enum: Object.values(NetworkStatus),
        default: NetworkStatus.ACTIVE,
        index: true
    },
    instruction: {
        type: String,
        minLength: [10, 'The instruction must be above 10'],
        maxLength: [1000, 'The instruction must be blew 1000']
    },
    siteWallet: {
        privateKey: {
            type: String,
            minLength: [10, 'The address must be above 10']
        },
        publicKey: {
            type: String,
            minLength: [5, 'The address must be above 5']
        },
        blocknumber: {
            type: Number
        }
    },
    isDelete: { type: Boolean },
    deleted_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { versionKey: false });


//? query middelware
networkSchema.pre(/^find/, function (next) {
    this.find({ isDelete: { $ne: true } });
    next();
});

const Network = mongoose.model('network', networkSchema, 'network');

module.exports = Network;