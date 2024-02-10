
exports.CoinPaymentPrivateKey = process.env.COINPAYMENT_API_PRIVATE_KEY
exports.CoinPaymentPublicKey = process.env.COINPAYMENT_API_PUBLIC_KEY

exports.SecretKey = process.env.SECRET_KEY
exports.SecretIV = process.env.SECRET_IV
exports.SourceUserId = process.env.TRANSFER_SOURCE_ID

exports.CoinpaymentCurrencies = ['BTC', 'DOGE', 'LTCT'];
exports.Web3Networks = ['BSC', 'ERC20', 'ARBITRUM', 'POLYGON'];

exports.NetworkSymbol = {
    BTC: 'BTC',
    LTC: 'LTC',
    DOGE: 'DOGE',
    ETH: 'ETH',
    TRX: 'TRX',
    BNB: 'BNB',
    XRP: 'XRP'
}

exports.TronGridKey = process.env.TRONGRID_APIKEY;
exports.TrxStockAdminFeeLimit = process.env.TRX_STOCK_ADMIN_FEE_LIMIT;
exports.TrxFeeLimit = process.env.TRX_FEE_LIMIT;
exports.TrxCreateAccountFee = process.env.TRX_CREATE_ACCOUNT_FEE;

exports.TrxBandWidthFee = process.env.TRX_BANDWIDTH_FEE;
exports.TrxEnergyFee = process.env.TRX_ENERGY_FEE;

exports.WebSocketRipple = process.env.WEBSOCKET_RIPPLE;
exports.ExplorerTrc20 = process.env.EXPLORER_TRC20;
exports.ExplorerRipple = process.env.EXPLORER_RIPPLE;
exports.CryptoWalletApiKey = process.env.CRYPTOWALLET_APIKEY;

exports.PendingTaskExecuterNumber = process.env.PENDING_TASK_EXECUTER_NUMBER;
exports.TronGridUrl = process.env.TRONGRID_URL;

exports.Web3StockAdminFeeLimit = process.env.WEB3_STOCK_ADMIN_FEE_LIMIT;
exports.Web3FeeLimit = process.env.Web3_FEE_LIMIT;

exports.XrpFeeLimit = process.env.XRP_FEE_LIMIT;

exports.web3GasLimit = process.env.WEB3_GAS_LIMIT;
exports.web3TokenGasLimit = process.env.WEB3_TOKEN_GAS_LIMIT;







