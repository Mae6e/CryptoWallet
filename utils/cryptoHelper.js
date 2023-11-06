const crypto = require('crypto');

//? utils
const { SecretKey, SecretIV } = require('../utils');

class CryptoHelper {
    static encrypt_method = "aes-256-cbc";
    static secret_key = SecretKey;
    static secret_iv = SecretIV;

    static encryptText(string) {
        const key = crypto.createHash('sha256').update(CryptoHelper.secret_key).digest('hex');
        const iv = crypto.createHash('sha256').update(CryptoHelper.secret_iv).digest('hex').slice(0, 16);
        const cipher = crypto.createCipheriv(CryptoHelper.encrypt_method, key, iv);
        let output = cipher.update(string, 'utf8', 'base64');
        output += cipher.final('base64');
        return output;
    }

    static decryptText(string) {
        const key = crypto.createHash('sha256').update(CryptoHelper.secret_key).digest('hex');
        const iv = crypto.createHash('sha256').update(CryptoHelper.secret_iv).digest('hex').slice(0, 16);
        const decipher = crypto.createDecipheriv(CryptoHelper.encrypt_method, key, iv);
        let output = decipher.update(string, 'base64', 'utf8');
        output += decipher.final('utf8');
        return output;
    }
}

module.exports = CryptoHelper;