'use strict';

const Sequelize = require('sequelize');

module.exports = (DBConnection) => {
    const PodcastEpisodesStatModel = DBConnection.define('podcast_episode_stat', {

         /**
         *  In http req body json, provide following values:
         *  ->  podcast_title
         *  ->  episode_number
         *  ->  episode_title
         */

        podcast_id:                  { type: Sequelize.STRING(64), allowNull: false, primaryKey: true },
        episode_number:              { type: Sequelize.BIGINT, allowNull: false, primaryKey: true },
        episode_title:               { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        episode_likes:               { type: Sequelize.BIGINT, allowNull: false, defaultValue: '0' },
        episode_play_count:          { type: Sequelize.BIGINT, allowNull: false, defaultValue: '0' }
    }, {
        timestamps: false,
    });
    return PodcastEpisodesStatModel;
};