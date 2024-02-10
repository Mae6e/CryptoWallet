
//? config environment variable
require('dotenv').config({ path: './.env.dev' });
console.log('Waiting ...');

const readline = require('readline');
const { encryptText } = require('../utils/cryptoEngine');

setTimeout(function () {
    execute();
}, 2000);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

//? execute update wallet
const executeEncryptText = async () => {
    rl.question('Enter command key: ', async (commandKey) => {
        if (commandKey === process.env.COMMAND_ACCESS_KEY) {
            rl.question('Enter Text: ', (text) => {
                console.log(`Encrypt Result: ${encryptText(text)}`);
                rl.close();
            });
        } else {
            console.log('The AccessKey is invalid!');
            rl.close();
        }
    });
}


//? main function for recognize 
const execute = async () => {
    try {
        await executeEncryptText();
    }
    catch (error) {
        console.log('exception-execute operations:', error.message);
    }
}