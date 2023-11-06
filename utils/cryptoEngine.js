

const crypto = require('crypto');


class CryptoEngine {

    static encryptText(string) {
        const secretKey = process.env.SECRET_KEY;
        const secretIv = process.env.SECRET_IV;

        const key = crypto.createHash('sha256').update(secretKey).digest('hex').slice(0, 32);
        const iv = crypto.createHash('sha256').update(secretIv).digest('hex').slice(0, 16);

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let output = cipher.update(string, 'utf8', 'base64');
        output += cipher.final('base64');
        return output;
    }

    static decryptText(string) {
        const secretKey = process.env.SECRET_KEY;
        const secretIv = process.env.SECRET_IV;

        const key = crypto.createHash('sha256').update(secretKey).digest('hex').slice(0, 32);
        const iv = crypto.createHash('sha256').update(secretIv).digest('hex').slice(0, 16);

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let output = decipher.update(string, 'base64', 'utf8');
        output += decipher.final('utf8');
        return output;
    }
}

module.exports = CryptoEngine;