//It is recommended to use ethers4.0.47 version
var ethers = require('ethers')

const AbiCoder = ethers.utils.AbiCoder;
const ADDRESS_PREFIX_REGEX = /^(41)/;
const ADDRESS_PREFIX = "41";

async function encodeParams(inputs){
    let typesValues = inputs
    let parameters = ''

    if (typesValues.length == 0)
        return parameters
    const abiCoder = new AbiCoder();
    let types = [];
    const values = [];

    for (let i = 0; i < typesValues.length; i++) {
        let {type, value} = typesValues[i];
        if (type == 'address')
            value = value.replace(ADDRESS_PREFIX_REGEX, '0x');
        else if (type == 'address[]')
            value = value.map(v => toHex(v).replace(ADDRESS_PREFIX_REGEX, '0x'));
        types.push(type);
        values.push(value);
    }

    console.log(types, values)
    try {
        parameters = abiCoder.encode(types, values).replace(/^(0x)/, '');
    } catch (ex) {
        console.log(ex);
    }
    return parameters

}


// 50000000000
async function main() {
    let inputs = [
        {type: 'address', value: "419ac7267ecbc51d67d9009ae87ed6bfde4540c561162580da"},
        {type: 'uint256', value: 180000000}
    ]
    let parameters = await encodeParams(inputs)
    console.log(parameters)
}
main()


// 5000 to 412ed5dd8a98aea00ae32517742ea5289761b2710e