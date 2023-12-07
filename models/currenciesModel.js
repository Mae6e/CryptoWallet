const mongoose = require('mongoose');
const { CurrencyType, CurrencyStatus,
    DepositStatus, WithdrawStatus, TransferStatus, TradeStatus,
    MemoStatus, FeeType, NetworkStatus } = require('../utils/constants');

let currencySchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: [true, 'The currency must be have a symbol'],
        minLength: [2, 'The symbol must be above 2'],
        maxLength: [10, 'The symbol must be blew 10'],
        uppercase: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'The currency must be have a name'],
        minLength: [2, 'The name must be above 2'],
        maxLength: [50, 'The name must be blew 50'],
        index: true
    },
    image: {
        type: String,
        required: [true, 'The currency must be have a image']
    },
    type: {
        type: String,
        default: CurrencyType.COIIN,
        enum: Object.values(CurrencyType),
        index: true
    },
    status: {
        type: Number,
        enum: Object.values(CurrencyStatus),
        default: CurrencyStatus.ACTIVE,
        index: true
    },
    deposit: {
        status: {
            type: Number,
            enum: Object.values(DepositStatus),
            default: DepositStatus.ACTIVE,
            index: true
        },
        minAmount: {
            type: Number,
            default: 0
        },
        maxAmount: {
            type: Number,
            default: 0
        },
        fee: {
            type: Number,
            default: 0
        },
        feeType: {
            type: String,
            default: FeeType.AMOUNT
        }
    },
    withdraw: {
        status: {
            type: Number,
            enum: Object.values(WithdrawStatus),
            default: WithdrawStatus.ACTIVE,
            index: true
        },
        minAmount: {
            type: Number,
            default: 0
        },
        maxAmount: {
            type: Number,
            default: 0
        },
        fee: {
            type: Number,
            default: 0
        },
        feeType: {
            type: String,
            default: FeeType.AMOUNT
        }
    },
    transfer: {
        status: {
            type: Number,
            enum: Object.values(TransferStatus),
            index: true
        },
        minAmount: {
            type: Number
        },
        maxAmount: {
            type: Number
        },
        fee: {
            type: Number
        },
        feeType: {
            type: String
        }
    },
    trade: {
        status: {
            type: Number,
            enum: Object.values(TradeStatus),
            default: TradeStatus.ACTIVE,
            index: true
        }
    },
    btc_price: {
        type: Number,
        default: 0.00000000
    },
    usdt_price: {
        type: Number,
        default: 0.00000000
    },
    decimalPoint: {
        type: Number,
        min: [0, 'The decimal point must be above 0'],
        max: [20, 'The decimal point must be blew 20'],
        default: 8
    },
    instruction: {
        type: String,
        minLength: [10, 'The instruction must be above 10'],
        maxLength: [1000, 'The instruction must be blew 1000']
    },
    networks: [{
        network: {
            type: mongoose.Schema.ObjectId,
            ref: "network",
            index: true
        },
        parent: {
            type: mongoose.Schema.ObjectId,
            ref: 'currencies',
            index: true,
            required: [false]
        },
        status: {
            type: Number,
            required: [true, 'The currency of network must be have a status'],
            enum: Object.values(NetworkStatus),
            index: true
        },
        decimalPoint: {
            type: Number,
            min: [0, 'The decimal point must be above 0'],
            max: [20, 'The decimal point must be blew 20']
        },
        contractAddress: {
            type: String,
            lowercase: true,
            minLength: [5, 'The contract address must be above 5'],
            maxLength: [50, 'The contract address must be blew 50']
        },
        // lastBlockNumber: {
        //     type: Number
        // },
        // lastExecutedAt: {
        //     type: Date
        // },
        memoStatus: {
            type: Number,
            enum: Object.values(MemoStatus),
        },
        memoInstruction: {
            type: String,
            minLength: [5, 'The memo instruction must be above 5']
        },
        adminWallet: {
            publicKey: {
                type: String,
                minLength: [5, 'The address must be above 5'],
                maxLength: [50, 'The address must be blew 50']
            },
            memo: String,
            memoStatus: { type: Number, enum: Object.values(MemoStatus) }
        }
    }],
    isDelete: { type: Boolean },
    deleted_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { versionKey: false });


//? query middelware
currencySchema.pre(/^find/, function (next) {
    this.find({ isDelete: { $ne: true } });
    next();
});

module.exports = mongoose.model('currencies', currencySchema, 'currencies');

