var adminaddress=process.argv[2];
const crypto = require('crypto-js');
const hashjs = require('hash.js');
const baseCodec = require('base-x');
const codec = baseCodec("rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz"); // for ripple
// npm install --save ripple-keypairs ripple-binary-codec ripple-hashes
const Keypairs = require('ripple-keypairs');
// const Binary = require('ripple-binary-codec');
const {
  computeBinaryTransactionHash
} = require('ripple-hashes');

/**
 * ripple address validation
 */
exports.isValidAddress = function(address) {
  if (/^r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,35}$/.test(address) === false)
    return false;
  return this.verifyChecksum(address);
};

exports.verifyChecksum = function(address) {
  const bytes = codec.decode(address);
  const computed = sha256(sha256(bytes.slice(0, -4))).slice(0, 4);
  const checksum = bytes.slice(-4);
  return seqEqual(computed, checksum);

  function sha256(bytes) {
    return hashjs.sha256().update(bytes).digest();
  }

  function seqEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
    for (let len = arr1.length, i = 0; i < len; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    return true;
  }
};

/**
 * ripple seed validation
 */
exports.isValidSeed = function(seed) {
  try {
    Keypairs.deriveKeypair(seed);
    return true;
  } catch (err) {
    return false;
  }
};