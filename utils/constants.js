
exports.NetworkStatus = {
    INACTIVE: 0,
    ACTIVE: 1,
    SUSPENDED: 2
}

exports.CurrencyType = {
    COIIN: "coin",
    FIAT: "fiat",
    TOKEN: "token",
    COIN_OR_TOKEN: "unified"
}

exports.CurrencyStatus = {
    INACTIVE: 0,
    ACTIVE: 1
}

exports.DepositStatus = {
    INACTIVE: 0,
    ACTIVE: 1
}

exports.WithdrawStatus = {
    INACTIVE: 0,
    ACTIVE: 1
}

exports.TransferStatus = {
    INACTIVE: 0,
    ACTIVE: 1
}

exports.TradeStatus = {
    INACTIVE: 0,
    ACTIVE: 1
}

exports.MemoStatus = {
    INACTIVE: 0,
    ACTIVE: 1
}

exports.FeeType = {
    AMOUNT: "amount",
    PERCENT: "percent"
}

exports.NetworkType = {
    BITCOIN: 1,
    LITECOIN: 2,
    DOGECOIN: 3,
    ERC20: 4,
    TRC20: 5,
    BSC: 6,
    RIPPLE: 7,
    ARBITRUM: 8,
    POLYGON: 9
}


exports.DepositState = {
    COMPLETED: 'completed'
}
exports.CryptoType = {
    CRYPTO: 'crypto'
}

exports.PaymentType = {
    4: 'Ethereum (ETH)',
    5: 'Tron (TRX)',
    6: 'Binance Coin (BNB)',
    7: 'Ripple (XRP)',
    8: 'Arbitrum (ETH)',
    9: 'Polygon (MATIC)'
}

exports.TokenPaymentType = {
    4: 'ETH (ETHEREUM)',
    5: 'Tron (TRC20)',
    6: 'BNB (BEP20)',
    8: 'ETH (ARBITRUM)',
    9: 'MATIC (POLYGON)'
}


exports.AdminTransferStatus = {
    PENDING: 1,
    SUCCESSS: 2,
    OUT_OF_ENERGY: 3
}

exports.AdminTransferTxtStatus = {
    PENDING: 'pending',
    SUCCESSS: 'SUCCESS',
    OUT_OF_ENERGY: 'OUT_OF_ENERGY'
}

exports.DepositMoveStatus = {
    NOT_MOVED: 0,
    MOVED: 1,
    COMPLETED: 2,
    FAILED: 3
}

exports.TokenFeeStatus = {
    ACTIVE: 'active',
    DEACTIVE: 'deactive'
}

