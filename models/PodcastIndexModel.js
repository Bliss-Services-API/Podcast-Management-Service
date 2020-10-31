'use strict';

/**
 * 
 * Model of the podcast_indices table in the podcasts database
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * 
 */
module.exports = (databaseConnection) => {
    const Sequelize = require('sequelize');
    return databaseConnection.define('podcast_index', {
        podcast_title:               { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        podcast_description:         { type: Sequelize.TEXT, allowNull: false },
        podcast_image_link:          { type: Sequelize.STRING, allowNull: false},
        podcast_host:                { type: Sequelize.STRING, allowNull: false },
        podcast_episodes_count:      { type: Sequelize.BIGINT, allowNull: false },
        podcast_subscribers_count:   { type: Sequelize.BIGINT, allowNull: false},
    }, {
        createdAt: 'podcast_creation_date',
        updatedAt: 'last_update',
        timestamps: true
    });
};