
const { TronGridUrl, TrxCreateAccountFee, TrxBandWidthFee } = require('../../utils');

const pvtKey = process.argv[2];
const from = process.argv[3];
const toAddr = process.argv[4];
const amount = Number(process.argv[5]);

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);


const checkAccountIsNew = async (address) => {
  try {
    const account = await tronWeb.trx.getAccount(address);
    if (Object.keys(account).length === 0) return true;
    return false;
  } catch (error) {
    return false;
  }
}

const signTransaction = async (params) => {
  const { pvtKey, from, toAddr, amount } = params;
  const tradeobj = await tronWeb.transactionBuilder.sendTrx(toAddr, amount, from, 1);
  const signedtxn = await tronWeb.trx.sign(tradeobj, pvtKey);
  return signedtxn;
}

const checkTransaction = async (params) => {
  const currenctBandWidth = await tronWeb.trx.getBandwidth(params.from);
  const signedtxn = await signTransaction(params);
  const neededBandWidth = ((signedtxn.raw_data_hex.length + signedtxn.signature[0].length) / 2) + 69;
  if (currenctBandWidth < neededBandWidth) {
    params.amount -= (neededBandWidth * TrxBandWidthFee);
    return await signTransaction(params);
  }
  return signedtxn;
}

const sendTransaction = async (params) => {
  try {
    if (await checkAccountIsNew(params.toAddr)) {
      params.amount -= TrxCreateAccountFee;
      const signedtxn = await signTransaction(params);
      const receipt = await tronWeb.trx.sendRawTransaction(signedtxn);
      console.log(JSON.stringify({ receipt, amount: params.amount }));
      process.exit(-1);
    }
    else {
      const signedtxn = await checkTransaction(params);
      const receipt = await tronWeb.trx.sendRawTransaction(signedtxn);
      console.log(JSON.stringify({ receipt, amount: params.amount }));
      process.exit(-1);
    }
  } catch (error) {
    console.error(error);
    process.exit(-1);
  }
}

sendTransaction({ pvtKey, from, toAddr, amount });

