
const Web3Helper = require('../../utils/web3Helper');
const AppError = require('../../utils/appError');

//? Use the web3Network variable in your script
const network = process.argv[2];
const contract = process.argv[3];
const address = process.argv[4];
const decimalPoint = process.argv[5];

const web3Helper = new Web3Helper();

const tokenBalance = async () => {
    try {

        const web3 = web3Helper.initialWeb3Network(network);
        if (!web3) {
            new AppError('The web3 object is null', 400);
        }

        const tokenAbi = [
            {
                constant: true,
                inputs: [{ name: '_owner', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ name: 'balance', type: 'uint256' }],
                type: 'function',
            },
        ]

        const tokenContract = new web3.eth.Contract(tokenAbi, contract);
        const balance = await tokenContract.methods.balanceOf(address).call();
        let tokenBalance = parseFloat(balance) * (1 / Math.pow(10, decimalPoint));

        console.log(JSON.stringify(tokenBalance));
    }
    catch (error) {
        new AppError(error.message);
    }
}


tokenBalance();

