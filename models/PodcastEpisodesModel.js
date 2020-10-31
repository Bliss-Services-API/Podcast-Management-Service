'use strict';

/**
 * 
 * Model of the podcast_episodes table in the podcasts database
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * 
 */
module.exports = (databaseConnection) => {
    const Sequelize = require('sequelize');
    return databaseConnection.define('podcast_episode', {
        podcast_title:            { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        episode_number:           { type: Sequelize.BIGINT, allowNull: false, primaryKey: true },
        episode_title:            { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        episode_description:      { type: Sequelize.TEXT, allowNull: false },
        episode_video_link:       { type: Sequelize.STRING, allowNull: false },
    }, {
        timestamps: true,
        updatedAt: false,
        createdAt: 'episode_upload_date'
    });
};