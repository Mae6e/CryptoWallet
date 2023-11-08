const axios = require('axios');
const crypto = require('crypto');

function encrypText(string) {
    try {
        const encrypt_method = "AES-256-CBC";
        const secret_key = 'F#7WED9zJm^!Plvxqm';
        const secret_iv = 'no4G%$c&OjDCrk%do';
        const key = crypto.createHash('sha256').update(secret_key).digest('hex');
        const iv = crypto.createHash('sha256').update(secret_iv).digest('hex').slice(0, 16);
        const cipher = crypto.createCipheriv(encrypt_method, key, iv);
        let output = cipher.update(string, 'utf8', 'base64');
        output += cipher.final('base64');
        return output;
    }
    catch (error) {
        console.log(error.message);
        return null;
    }
}

function decrypText(string) {
    const encrypt_method = "AES-256-CBC";
    const secret_key = 'F#7WED9zJm^!Plvxqm';
    const secret_iv = 'no4G%$c&OjDCrk%do';
    const key = crypto.createHash('sha256').update(secret_key).digest('hex');
    const iv = crypto.createHash('sha256').update(secret_iv).digest('hex').slice(0, 16);
    const decipher = crypto.createDecipheriv(encrypt_method, key, iv);
    let output = decipher.update(string, 'base64', 'utf8');
    output += decipher.final('utf8');
    return output;
}

function randomString(length) {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charactersLength = characters.length;
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return randomString;
}

function bchexdec(hex) {
    console.log('hex hex hex');
    console.log(hex);

    if (hex.length === 1) {
        return parseInt(hex, 16);
    } else {
        const remain = hex.slice(0, -1);
        const last = hex.slice(-1);
        return BigInt(16) * BigInt(bchexdec(remain)) + BigInt(parseInt(last, 16));
    }
}

async function connectJsonRpc(params, cmd, postfields) {
    const data = {
        jsonrpc: 1.0,
        id: 1,
        method: cmd,
        params: postfields
    };
    const url = `http://${params.ip}:${params.port}`;
    const response = await axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${params.user}:${params.password}`).toString('base64')}`
        }
    });
    return response.data;
}

async function getUrlContents(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
        }
    });
    return response.data;
}

async function sendBackEmail(method, postfields) {
    let url;
    if (method === 'Deposit') {
        url = 'https://bitcoivaapi.hivelancetech.com/deposit/depoConfrmEmal';
    }
    const response = await axios.post(url, postfields, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.data;
}

async function getBlockTrans(start, end) {
    const blocks = {
        startNum: start,
        endNum: end
    };
    const response = await connectJsonRpc(params, 'getblocktrans', blocks);
    return response;
}

async function generateAddress(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getTransaction(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getReceivedByAddress(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getTransactionInfo(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function sendRawTransaction(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getBlockCount(params, cmd) {
    const response = await connectJsonRpc(params, cmd);
    return response;
}

async function getBalance(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getReceivedByLabel(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getAccount(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getAddressByAccount(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getNewAddress(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function setAccount(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getAddressesByAccount(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function moveFunds(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function listTransactions(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function listAccounts(params, cmd) {
    const response = await connectJsonRpc(params, cmd);
    return response;
}

async function createWallet(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getWalletInfo(params, cmd) {
    const response = await connectJsonRpc(params, cmd);
    return response;
}


async function getCoinAddress(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getBlockHash(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getAddressInfo(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function generateDepositAddress(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getAccountBalance(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}

async function getAccountDepositAddress(params, cmd, postfields) {
    const response = await connectJsonRpc(params, cmd, postfields);
    return response;
}


module.exports = {
    encrypText,
    randomString,
    bchexdec
}