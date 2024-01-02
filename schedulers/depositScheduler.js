
const cron = require('node-cron');

const DepositService = require('../services/depositService');
const depositService = new DepositService();

//? utils
const { NetworkSymbol } = require('../utils/index');
const { NetworkType } = require('../utils/constants');

console.log('two')


let f = 0;
//cron.schedule('*/1 * * * *', async () => {
setInterval(async () => {
    console.log('this');
    //if (f === 0) {
    // console.log('test')
    await depositService.updateWalletBalance({ symbol: NetworkSymbol.XRP, networkType: NetworkType.RIPPLE });
    //  }
    //f = 1;
    console.log('fffffff');

}, 5000);
// });