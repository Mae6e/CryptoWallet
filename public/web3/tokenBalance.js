const Web3Helper = require('../../utils/web3Helper');

//? Use the web3Network variable in your script
const network = process.argv[2];
const contract = process.argv[3];
const address = process.argv[4];

const web3Helper = new Web3Helper();

const tokenBalance = async () => {
    try {

        const web3 = web3Helper.initialWeb3Network(network);
        if (!web3) {
            console.error('The web3 object is null');
            process.exit(-1);
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
        console.log(JSON.stringify(balance.toString()));
        process.exit(-1);
    }
    catch (error) {
        console.error(error);
        process.exit(-1);
    }
}


tokenBalance();

