
const { Worker } = require('worker_threads');


exports.web3TrackTransactionsCreateWorker = ({ network, fromBlock, toBlock }) => {

    return new Promise((resolve, reject) => {
        const worker = new Worker('./workers/web3TrackWorker.js', { workerData: { network, fromBlock, toBlock } });
        worker.on('message', (data) => {
            resolve(data);
        });
        worker.on('error', () => {
            reject();
        });
        worker.on('exit', (code) => {
            // if (code !== 0)
            //     reject(new Error(`stopped with  ${code} exit code`));
            if (worker)
                worker.terminate();
        })
    });
}