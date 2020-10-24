'use strict';

const Sequelize = require('sequelize');

module.exports = (DBConnection) => {
    const PodcastEpisodesModel = DBConnection.define('podcast_episode', {
        
        /**
         *  In http req body json, provide following values:
         *  ->  podcast_title
         *  ->  episode_number
         *  ->  episode_title
         *  ->  episode_description
         */

        podcast_id:               { type: Sequelize.STRING(64), allowNull: false, primaryKey: true},
        episode_number:           { type: Sequelize.BIGINT, allowNull: false, primaryKey: true },
        episode_title:            { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        episode_description:      { type: Sequelize.TEXT, allowNull: false },
        episode_upload_date:      { type: Sequelize.DATE, allowNull: false },
        episode_video_link:       { type: Sequelize.STRING, allowNull: false },
    }, {
        timestamps: true,
        updatedAt: false,
        createdAt: 'episode_upload_date'
    });
    return PodcastEpisodesModel;
};