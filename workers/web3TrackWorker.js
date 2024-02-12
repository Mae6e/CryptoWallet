const Web3Helper = require('../utils/web3Helper');
const web3Helper = new Web3Helper();

//? worker
const { workerData, parentPort } = require('worker_threads');

async function getTransactionsFromBlockNumber(network, fromBlock, toBlock) {
    return web3Helper.getTransactionsFromBlockNumber(network, fromBlock, toBlock);
}

const execute = (async () => {
    const { fromBlock, toBlock, network } = workerData;
    const result = await getTransactionsFromBlockNumber(network, fromBlock, toBlock);
    parentPort.postMessage({ end: true, result });
});

execute();