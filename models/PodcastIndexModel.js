'use strict';

const Sequelize = require('sequelize');

module.exports = (pgConnection) => {
    const PodcastIndex = pgConnection.define('podcast_index', {

        /**
         *  In http req body json, provide following values:
         *  ->  podcast_title
         *  ->  podcast_description
         *  ->  podcast_host
         */

        podcast_id:                  { type: Sequelize.STRING(64), allowNull: false, primaryKey: true},
        podcast_title:               { type: Sequelize.STRING, allowNull: false },
        podcast_description:         { type: Sequelize.TEXT, allowNull: false },
        podcast_image_link:          { type: Sequelize.STRING, allowNull: false},
        podcast_host:                { type: Sequelize.STRING, allowNull: false },
        podcast_episodes_count:      { type: Sequelize.BIGINT, allowNull: false },
        podcast_subscribers_count:   { type: Sequelize.BIGINT, allowNull: false},
        podcast_creation_date:       { type: Sequelize.DATE, allowNull: false },
        last_update:                 { type: Sequelize.DATE, allowNull: false }
    }, {
        createdAt: 'podcast_creation_date',
        updatedAt: 'last_update',
        timestamps: true
    });

    return PodcastIndex;
};