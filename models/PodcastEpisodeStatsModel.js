'use strict';

/**
 * 
 * Model of the podcast_episodes_stats table in the podcasts database
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * 
 */
module.exports = (databaseConnection) => {
    const Sequelize = require('sequelize');
    return databaseConnection.define('podcast_episode_stat', {
        podcast_title:               { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        episode_number:              { type: Sequelize.BIGINT, allowNull: false, primaryKey: true },
        episode_title:               { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        episode_length:              { type: Sequelize.BIGINT, allowNull: false },
        episode_likes:               { type: Sequelize.BIGINT, allowNull: false },
        episode_play_count:          { type: Sequelize.BIGINT, allowNull: false }
    }, {
        timestamps: false,
    });
};