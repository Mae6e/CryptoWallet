const mongoose = require('mongoose');

const DB = process.env.DB_CONNECTION;
const dbName = process.env.DB_NAME;
const options = { useNewUrlParser: true, useUnifiedTopology: true, dbName };

//? connect to database
mongoose.connect(DB, options)
    .then(() => {
        console.log('DB Connection Successful!');
    }).catch((err) => console.log(err));

