
const xrp = require('ripple-keypairs');

generateAddress = () => {
    try {
        const secret = xrp.generateSeed();
        const keypair = xrp.deriveKeypair(secret);
        const address = xrp.deriveAddress(keypair.publicKey);

        const balancesJSON = JSON.stringify({ secret, address });
        console.log(balancesJSON);
    }
    catch (error) {
        console.error(error);
    }
}

generateAddress();





