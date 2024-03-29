//? config environment variable
require('dotenv').config({ path: './.env.dev' });

//? config express
const express = require('express');
const app = express();
const cors = require("cors");

//? development logging
const morgan = require('morgan');
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

//? config connction database
require('./config/db').connect();

const workers = require('./workers');

const walletAddressRoutes = require('./routes/walletAddressRoutes');
const errorController = require('./controllers/errorController');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/v1/wallets', walletAddressRoutes);

app.use(
    morgan("dev", {
        skip: function (req, res) {
            return res.statusCode < 400;
        },
    })
);

//? dont access not defined routes
app.all('*', (req, res, next) => {
    res.status(404)
        .json({
            status: 'fail',
            message: `The ${req.originalUrl} can not find on this server!`
        });
});

//? initial server running
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App runnig on port ${port}...`);
});

//? run worker
workers.runWorker();

app.use(errorController);