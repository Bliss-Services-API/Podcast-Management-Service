'use strict';


/**
 * 
 * Get the Sequelize Database Connection object, based on the env of the server running
 * 
 * @param {String} mode NODE_ENV env variable, representing the env of the server running. Values could be
 * either 'development' or 'production'
 */
module.exports = (mode) => {
    const Sequelize = require('sequelize');
    const config = require('../config/config.json');
    
    if(mode == 'development')
        return new Sequelize(config.development.database, config.development.username, config.development.password, {
            host: config.development.host,
            port: config.development.port,
            dialect: config.development.dialect,
            logging: console.log,
            pool: {
                max: 5,
                min: 0,
                idle: 1000
            },
        })

    else
        return new Sequelize(config.production.database, config.production.username, config.production.password, {
            host: config.production.host,
            port: config.production.port,
            dialect: config.production.dialect,
            logging: console.log,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            pool: {
                max: 5,
                min: 0,
                idle: 1000
            }
        })
}