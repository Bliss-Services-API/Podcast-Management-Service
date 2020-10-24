'use strict';

require('dotenv').config();

// const DBConnection = require('./connections/PGConnection');
const bodyParser = require('body-parser');
const express = require('express');
const PodcastRoutesAPI = require('./routes/routes');
const firebaseAdmin = require('firebase-admin');
const firebaseServiceKey = require('./config/firebase.json');
const morgan = require('morgan');

const PORT = process.env.PORT || 7001;
const DBConnection = require('./connections/PGConnection')(process.env.NODE_ENV);
console.log(process.env.NODE_ENV);

const app = express();

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(firebaseServiceKey),
    storageBucket: "twilight-cloud.appspot.com"
})

const firebaseBucket = firebaseAdmin.storage().bucket();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(morgan('dev'));

DBConnection
    .authenticate()
    .then(() => { console.info(`Admin DB Connection Established Successfully!`); })
    .then(() => {
        app.use('/admin/podcast', PodcastRoutesAPI(DBConnection, firebaseBucket));
        console.info(`Routes Established Successfully!`);
    })
    .catch((err) => { console.error(`Admin DB Connection Failed!\nError:${err}`); })

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})