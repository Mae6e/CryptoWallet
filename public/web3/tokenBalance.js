const Web3 = require('web3');
const { NetworkName } = require('../../utils');

//? Use the web3Network variable in your script
const network = process.argv[2];
const contract = process.argv[3];
const address = process.argv[4];

let web3;

//? MainNet
if (network === NetworkName.BSC) {
    web3 = new Web3(process.env.RPC_ENDPOINT_BSC);
}
else if (network === NetworkName.ERC20) {
    web3 = new Web3(process.env.RPC_ENDPOINT_ERC20);
}
else if (network === NetworkName.ARBITRUM) {
    web3 = new Web3(process.env.RPC_ENDPOINT_ARBITRUM);
}
else if (network === NetworkName.POLYGON) {
    web3 = new Web3(process.env.RPC_ENDPOINT_POLYGON);
} else {
    return;
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

const balance = await tokenContract.methods.balanceOf(address).call()
    .then(balance => {
        console.log(JSON.stringify(balance));
    })
    .catch(error => {
        console.error(JSON.stringify('0'));
    });

