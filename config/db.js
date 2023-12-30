const mongoose = require('mongoose');

const DB = process.env.DB_CONNECTION;
const dbName = process.env.DB_NAME;
const options = { useNewUrlParser: true, useUnifiedTopology: true, dbName };

//? connect to database
exports.connect = async () => {
    try {
        await mongoose.connect(DB, options);
        console.log('DB Connection Successful!');
    } catch (err) {
        console.log(err);
    }
}

