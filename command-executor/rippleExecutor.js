

//? config environment variable
require('dotenv').config({ path: './.env.dev' });
console.log('Waiting ...');

//? config connction database
const db = require('../config/db');

const readline = require('readline');
const WalletAddressService = require('../services/walletAddressService');

setTimeout(function () {
    execute();
}, 2000);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

//? execute update wallet
const executeUpdateRippleWallet = async () => {
    rl.question('Enter command key: ', async (commandKey) => {
        if (commandKey === process.env.COMMAND_ACCESS_KEY) {
            //? connect to db
            await db.connect();
            rl.question('Enter private key: ', (privateKey) => {
                rl.question('Enter public key: ', async (publicKey) => {
                    await WalletAddressService.updateRippleWallet({
                        privateKey,
                        publicKey
                    });
                    rl.close();
                });
            });
        } else {
            console.log('The AccessKey is invalid!');
            rl.close();
        }
    });
}


//? execute generate wallet
const executeGenerateRippleWallet = async () => {
    rl.question('Enter command key: ', async (commandKey) => {
        if (commandKey === process.env.COMMAND_ACCESS_KEY) {
            //? connect to db
            await db.connect();
            await WalletAddressService.generateRippleWallet();
            rl.close();

        } else {
            console.log('The AccessKey is invalid!');
            rl.close();
        }
    });
}

//? main function for recognize 
const execute = async () => {
    try {
        const command = process.argv[2];
        switch (command) {
            case '-update':
                await executeUpdateRippleWallet();
                break;
            case '-generate':
                await executeGenerateRippleWallet();
                break;
            default:
                console.log('The Command is invalid!');
                break;
        }
    }
    catch (error) {
        console.log('exception-execute operations:', error.message);
    }
}