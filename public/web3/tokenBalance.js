const web3Helper = require('../../utils/web3Helper');

//? Use the web3Network variable in your script
const network = process.argv[2];
const contract = process.argv[3];
const address = process.argv[4];


const tokenBalance = async () => {
    try {
        const web3 = web3Helper.initialWeb3Network(network);
        if (!web3) {
            // console.log(JSON.stringify(0));
            throw new Error('error not found');

        }
        const minABI = [
            {
                constant: true,
                inputs: [{ name: '_owner', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ name: 'balance', type: 'uint256' }],
                type: 'function',
            },
        ]

        const tokenContract = new web3.eth.Contract(minABI, contract);
        throw new Error('tokenContract');
        const balance = await tokenContract.methods.balanceOf(address).call();
        console.log(JSON.stringify(balance));
    }
    catch (error) {
        console.error(JSON.stringify(0));
    }
}

tokenBalance();

