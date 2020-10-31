'use strict';


/**
 * 
 * **Server EntryPoint**
 * 
 * This is the enrtypoint for the server Podcast-Management-Service, which will handle
 * all the podcasts and their episodes in the app Bliss App. All of the APIs/Routes are
 * protected behind the Bearer Token Auth, which can be accessed by the JWT Permanent
 * tokens, which are generated from the Authentication-Service of the Bliss App.
 * 
 */
require('dotenv').config();

const bodyParser = require('body-parser');
const express = require('express');
const podcastRoutes = require('./routes/routes');
const firebaseAdmin = require('firebase-admin');
const firebaseServiceKey = require('./config/firebase.json');
// const morgan = require('morgan');
const chalk = require('./chalk.console');

const PORT = process.env.PORT || 7001;
const ENV = process.env.NODE_ENV;

if(ENV === 'development') {
    console.log(chalk.info("##### SERVER IS RUNNING IN DEVELOPMENT MODE #####"));
} else if(ENV === 'production') {
    console.log(chalk.info("##### SERVER IS RUNNING IN PRODUCTION MODE #####"));
} else {
    console.log(chalk.error("NO NODE_ENV IS PROVIDED"));
    process.exit(1);
}

const databaseConnection = require('./connections/PGConnection')(ENV);
const app = express();

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(firebaseServiceKey),
    storageBucket: "twilight-cloud.appspot.com"
})

const firebaseBucket = firebaseAdmin.storage().bucket();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
// app.use(morgan('dev'));

databaseConnection
    .authenticate()
    .then(() => console.info(`Database Connection Established Successfully!`))
    .then(() => app.use('/podcast', podcastRoutes(databaseConnection, firebaseBucket)))
    .then(() => console.info(`Routes Established Successfully!`))
    .catch((err) => console.error(`Database Connection Failed!\nError:${err}`));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));