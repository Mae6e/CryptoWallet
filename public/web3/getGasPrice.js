const Web3Helper = require('../../utils/web3Helper');

//? Use the web3Network variable in your script
const network = process.argv[2];

const web3Helper = new Web3Helper();

estimateFee = async () => {
    try {
        const web3 = web3Helper.initialWeb3Network(network);
        if (!web3) {
            console.error('The web3 object is null');
            process.exit(-1);
        }
        const response = await web3.eth.getGasPrice();
        console.log(JSON.stringify(response.toString()));
        process.exit(-1);

    } catch (error) {
        console.error(error);
        process.exit(-1);
    }
}

estimateFee();
