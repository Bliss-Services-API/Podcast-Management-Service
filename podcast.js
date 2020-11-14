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

const AWS = require('aws-sdk');
const morgan = require('morgan');
const express = require('express');
const chalk = require('./chalk.console');
const bodyParser = require('body-parser');
const podcastRoutes = require('./routes/routes');
const postgresConnection = require('./connections/PostgresConnection');

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV;

if(ENV === 'development') {
    console.log(chalk.info("##### SERVER IS RUNNING IN DEVELOPMENT MODE #####"));
} else if(ENV === 'production') {
    console.log(chalk.info("##### SERVER IS RUNNING IN PRODUCTION MODE #####"));
} else {
    console.log(chalk.error("NO NODE_ENV IS PROVIDED"));
    process.exit(1);
}

const postgresClient = postgresConnection(ENV);
const app = express();

AWS.config.getCredentials((err) => {
    if(err) {
        console.error(chalk.error(`CREDENTIALS NOT LOADED`));
        process.exit(1);
    }
    else console.log(chalk.info(`##### AWS ACCESS KEY IS VALID #####`));
});

AWS.config.update({region: 'us-east-2'});
const S3Client = new AWS.S3({apiVersion: '2006-03-01'});
const SNSClient = new AWS.SNS({apiVersion: '2010-03-31'});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(morgan('dev'));

postgresClient
    .authenticate()
    .then(() => console.info(`Database Connection Established Successfully!`))
    .then(() => app.use('/admin', podcastRoutes(postgresClient, S3Client, SNSClient)))
    .then(() => app.get('/ping', (req, res) => res.send('OK')))
    .then(() => console.info(`Routes Established Successfully!`))
    .catch((err) => console.error(`Database Connection Failed!\nError:${err}`));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));