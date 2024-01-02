const Web3Helper = require('../../utils/web3Helper');

//? Use the web3Network variable in your script
const network = process.argv[2];
const web3Helper = new Web3Helper();

const generate = async () => {
    try {
        const web3 = web3Helper.initialWeb3Network(network);
        if (!web3) {
            console.error('The web3 object is null');
        }
        const addr = web3.eth.accounts.create([process.env.WEB3_KEY]);
        console.log(JSON.stringify(addr));
    }
    catch (error) {
        console.error(error.message);
    }
}

generate();
