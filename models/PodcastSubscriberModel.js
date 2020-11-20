  
'use strict';

/**
 * 
 * Model of the client-credentials Table in the Database credentials;
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object
 * 
 */
module.exports = (postgresClient) => {
    const Sequelize = require('sequelize');
    
    const PodcastSubscribersModel = postgresClient.define('podcast_subscriber', {
        client_id:           { type: Sequelize.STRING, primaryKey: true },
        podcast_title:       { type: Sequelize.STRING, primaryKey: true }
    }, {
        timestamps: true,
        updatedAt: false,
        createdAt: 'subscription_date'
    });

    return PodcastSubscribersModel;
}