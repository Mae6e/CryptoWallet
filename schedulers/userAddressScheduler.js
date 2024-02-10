
require('dotenv').config({ path: './.env.dev' });
require('../config/db').connect();

const Network = require('../models/networkModel');
const UserAddress = require('../models/userAddressModel');

const execute = async () => {

    const array = ['BNB', 'TRX', 'XRP'];
    for (const item of array) {
        Network.findOne({ symbol: item })
            .then(network => {
                if (!network) {
                    throw new Error(`Network with symbol '${item}' not found`);
                }

                const networkId = network._id;
                let walletProvider = 0;
                if (item === 'BNB') {
                    walletProvider = 1;
                }

                console.log(`update UserAddress with symbol '${item}' is running...`);

                return UserAddress.updateMany(
                    { 'address.currency': item },
                    {
                        '$set': {
                            'address.$.network': networkId,
                            'address.$.walletProvider': walletProvider
                        }
                    });

            })
            .then(result => {
                console.log(`${item}: ${JSON.stringify(result)} addresses updated successfully`);
            })
            .catch(error => {
                console.error(error);
            });
    }

}

console.log('waiting....');

setTimeout(async () => {
    await execute();
}, 2000)