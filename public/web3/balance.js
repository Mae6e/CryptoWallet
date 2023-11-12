const Web3Helper = require('../../utils/web3Helper');
const AppError = require('../../utils/appError');

//? Use the web3Network variable in your script
const network = process.argv[2];
const address = process.argv[3];

const web3Helper = new Web3Helper();

balance = async () => {
    try {
        const web3 = web3Helper.initialWeb3Network(network);
        if (!web3) {
            new AppError('The web3 object is null', 400);
        }
        const response = await web3.eth.getBalance(address);
        console.log(JSON.stringify(web3.utils.fromWei(response, 'ether')));

    } catch (error) {
        new AppError(error.message);
    }
}

balance();
