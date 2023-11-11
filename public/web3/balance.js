const web3Helper = require('../../utils/web3Helper');

//? Use the web3Network variable in your script
const network = process.argv[2];
const address = process.argv[3];

balance = async () => {
    try {
        const web3 = web3Helper.initialWeb3Network(network);
        if (!web3) {
            console.log(JSON.stringify(0));
        }
        const response = await web3.eth.getBalance(address);
        console.log(JSON.stringify(web3.utils.fromWei(response, 'ether')));

    } catch (error) {
        console.log(JSON.stringify(0));
    }
}

balance();
