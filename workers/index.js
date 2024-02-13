const workerpool = require('workerpool');
const cron = require('node-cron');

//? initial worker pool
const pool = workerpool.pool('./workers/depositWorker.js');

//? repository
const NetworkRepository = require('../repositories/networkRepository');
const DepositWorkerRepository = require('../repositories/depositWorkerRepository');

//? service
const UtilityService = require('../services/utilityService');
const utilityService = new UtilityService();
const DepositService = require('../services/depositService');
const depositService = new DepositService();

//? deposit scheduler
const depositScheduler = require('../schedulers/depositScheduler');

//? utils
const { BlockOffset, DepositWorkerStatus,
    NetworkType, NetworkStatus } = require('../utils/constants');

//? the status of worker pool
console.log(pool.stats());

//? create tasks
const taskManager = async (param) => {
    try {

        //? network
        const network = {
            type: param.type,
            symbol: param.symbol,
            lastBlockNumber: param.lastBlockNumber,
            offset: BlockOffset[param.type],
            sitePublicKey: param.siteWallet.publicKey
        };

        network.lastOnlineBlockNumber = await utilityService.getLastOnlineBlockNumber(network.type);

        const lastOnlineBlockIndex = network.lastOnlineBlockNumber;
        const lastBlockIndex = network.lastBlockNumber || lastOnlineBlockIndex - 1;
        let initialBlockIndex = lastBlockIndex + 1;
        const offset = network.offset;
        const isEssentialTask = lastOnlineBlockIndex - lastBlockIndex > offset;

        if ((initialBlockIndex >= lastOnlineBlockIndex && offset > 20) ||
            (initialBlockIndex > lastOnlineBlockIndex && offset <= 20)) { console.log("invalid blockNumber"); return; }

        console.log('starting ...', param.symbol);
        // console.log('lastOnlineBlockIndex: ', lastOnlineBlockIndex);
        // console.log('lastBlockIndex: ', lastBlockIndex);

        network.initialBlockIndex = initialBlockIndex;
        let workers = [];
        //? check exists untrack block and add to db
        if (isEssentialTask) {

            const getUntrackResponse = await DepositWorkerRepository.getUntrackWorker(network.type);
            if (getUntrackResponse) {
                //console.log('checking last task ...');
                if (lastBlockIndex < getUntrackResponse.endBlockIndex) {
                    initialBlockIndex = getUntrackResponse.targetBlockIndex;
                }
            }

            const diffLength = lastOnlineBlockIndex - initialBlockIndex;
            const loopNumber = Math.ceil((diffLength) / offset);

            //? add new worker to db-queue
            for (let i = 0; i < loopNumber; i++) {

                const targetBlockIndex = initialBlockIndex + offset;
                let worker = {
                    networkType: network.type,
                    networkSymbol: network.symbol,
                    initialBlockIndex,
                    targetBlockIndex: targetBlockIndex > lastOnlineBlockIndex ?
                        lastOnlineBlockIndex : targetBlockIndex,
                    endBlockIndex: lastOnlineBlockIndex
                };

                if (i === loopNumber - 1) {
                    network.initialBlockIndex = initialBlockIndex;
                } else {
                    workers.push(worker);
                    initialBlockIndex += offset;
                }
            }

            const batchSize = 10000;
            for (let i = 0; i < workers.length; i += batchSize) {
                const batch = workers.slice(i, i + batchSize);
                await DepositWorkerRepository.insertMany(batch);
            }

            if (workers.length > 0) {
                //? update lastblock
                await NetworkRepository.updateLastStatusOfNetwork(network.id, initialBlockIndex - 1);
                //console.log('taskManager updated blockNumber');
            }
        }

        //console.log("execute scheduler....");
        await depositScheduler.updateWallets(network);

        return 1;
    } catch (error) {
        console.log(error.message);
        return 0;
    }
}

//? save a task and add another task to queue
const saveTask = async ({ task, result }) => {
    let { _id, networkSymbol, networkType, currentBlockIndex, targetBlockIndex } = task;

    //? update current block index
    if (!result) {
        console.log('can not find result ...');
    } else {
        //? deposit
        await depositService.updateWalletBalance({
            symbol: networkSymbol,
            networkType,
            initialBlockIndex: currentBlockIndex,
            endBlockIndex: targetBlockIndex,
            recipientTransactions: result.recipientTransactions,
            adminTransactions: result.adminTransactions,
            hasUpdatedBlockIndex: false
        });

        const status = (currentBlockIndex === targetBlockIndex ?
            DepositWorkerStatus.SUCCESS : DepositWorkerStatus.PENDING);
        //? update next index
        await DepositWorkerRepository.updateCurrentBlockById(_id, targetBlockIndex, status);
    }

}

const execute = async ({ index, total, task }) => {
    pool.exec('trackBlocks', [task])
        .then(async function (result) {
            await saveTask({ task, result });
            if (index === total) {
                console.log('preparing task ...');
                await preparingTask({ networkType: task.networkType, sitePublicKey: task.sitePublicKey });
            }
        })
        .catch(async function (err) {
            console.error('the pool return an error:');
            console.error(err);
            if (index === total) {
                console.log('preparing task ...');
                await preparingTask({ networkType: task.networkType, sitePublicKey: task.sitePublicKey });
            }
        });
}


const preparingTask = async ({ networkType, sitePublicKey }) => {
    const taskQueue = await DepositWorkerRepository.getAllPendingWorker(networkType);
    const taskQueueLength = taskQueue.length;
    if (!taskQueueLength) {
        console.error('the tasks finished.');
        return;
    };
    for (let i = 0; i < taskQueueLength; i++) {
        let task = taskQueue[i];
        task.sitePublicKey = sitePublicKey;
        await execute({ index: i, total: taskQueueLength - 1, task });

    }
}


//? main function
exports.runWorker = () => {
    try {
        const networkTypes = Object.values(NetworkType);

        for (const networkType of networkTypes) {
            let time = 1;
            ((networkType) => {

                switch (networkType) {
                    case NetworkType.BSC:
                        time = 2;
                        break;

                    case NetworkType.TRC20:
                        time = 3;
                        break;

                    case NetworkType.ERC20:
                        time = 1;
                        break;

                    case NetworkType.POLYGON:
                        time = 5;
                        break;

                    case NetworkType.ARBITRUM:
                        time = 5;
                        break;

                    case NetworkType.RIPPLE:
                        time = 3;
                        break;

                    default:
                        break;
                }

                cron.schedule(`*/${time} * * * *`, async () => {
                    const network = await NetworkRepository.getNetworkByType(networkType);
                    if (!network || network.status !== NetworkStatus.ACTIVE) return;

                    console.log(`****************working the network ${network.symbol}*******************`);

                    //? generate workers
                    await taskManager(network);
                    //? execute workers and main task
                    await preparingTask({ sitePublicKey: network.siteWallet.publicKey, networkType: network.type });
                });

            })(networkType);
        }
    } catch (error) {
        console.log("runWorker: ", error.message);
    }
}



//? main function
exports.runWorkerByNetwork = async (networkType) => {
    try {
        const network = await NetworkRepository.getNetworkByType(networkType);
        if (!network || network.status !== NetworkStatus.ACTIVE) {
            console.log(`the ${network.symbol} network is not active.`);
            return false;
        }

        console.log(`check ${network.symbol} deposit and transfer ....`);

        //? generate workers
        await taskManager(network);
        //? execute workers and main task
        await preparingTask({ sitePublicKey: network.siteWallet.publicKey, networkType: network.type });

        return true;
    } catch (error) {
        console.log("runWorkerByNetwork: ", error.message);
        return false;
    }
}