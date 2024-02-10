
const { TronGridUrl } = require('../../utils');
const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(TronGridUrl);
const solidityNode = new HttpProvider(TronGridUrl);
const eventServer = new HttpProvider(TronGridUrl);
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

let address = process.argv[2];
let to = process.argv[3];
let amount = parseInt(process.argv[4]);
let contractAddress = process.argv[5];


transferCheck(address, amount, contractAddress, to);

async function transferCheck(address, amount, contractAddress, to) {
    // example
    // const parameter1 = [{ type: 'address', value: 'TDP3AdQ2HXDpF81aYBCv3UWnYJvJtLamv2' }, { type: 'uint256', value: 558 }];
    // const transaction = await tronWeb.transactionBuilder.triggerConstantContract("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "transfer(address,uint256)", {},
    // parameter1, "TQaGgWx2GLVqErxJHueHGPKuU5KqLKNtAJ");

    try {
        const parameter = [{ type: 'address', value: to }, { type: 'uint256', value: amount }];
        const transaction = await tronWeb.transactionBuilder.triggerConstantContract
            (contractAddress, "transfer(address,uint256)", {}, parameter, address);

        console.log(JSON.stringify(transaction));
        process.exit(-1);
    }
    catch (error) {
        console.error(error);
        process.exit(-1);
    }
}