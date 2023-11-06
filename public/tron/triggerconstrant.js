const TronWeb = require('tronweb');
const TronGrid = require('trongrid');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
var tronWeb = new TronWeb(fullNode, solidityNode, eventServer);




let address = process.argv[2];
let to = process.argv[3];
let amount = parseInt(process.argv[4]);
let contractAddress = process.argv[5];

// console.log(contractAddress);
transferCheck(address, amount, contractAddress, to);

async function transferCheck(address , amount , contractAddress ,to) {
    //example
    // const parameter1 = [{ type: 'address', value: 'TDP3AdQ2HXDpF81aYBCv3UWnYJvJtLamv2' }, { type: 'uint256', value: 558 }];
    // //contract -- function -- parameter -- toAddress
    //     const transaction = await tronWeb.transactionBuilder.triggerConstantContract("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "transfer(address,uint256)", {},
    //     parameter1, "TQaGgWx2GLVqErxJHueHGPKuU5KqLKNtAJ");



    const parameter1 = [{type: 'address', value: address}, {type: 'uint256', value: amount}];
    //contract -- function -- parameter -- toAddress
    const transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress, "transfer(address,uint256)", {},
        parameter1, to);

    console.log(JSON.stringify(transaction));
    process.exit(-1);


}

// process.exit(-1);
// const result = tronWeb.transactionBuilder.estimateEnergy('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', "transfer(address,uint256)",
//     {}, parameter1, "TTi3AzgogcpV5qZkV4xHiWLsoKQTXuSrx7");
