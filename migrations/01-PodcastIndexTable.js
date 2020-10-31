'use strict';

/**
 * 
 * Migration of podcast_indices table in the Database podcasts
 * 
 */
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('podcast_indices', {
            podcast_title:               { type: Sequelize.STRING, allowNull: false, primaryKey: true },
            podcast_description:         { type: Sequelize.TEXT, allowNull: false },
            podcast_image_link:          { type: Sequelize.STRING, allowNull: false},
            podcast_host:                { type: Sequelize.STRING, allowNull: false },
            podcast_episodes_count:      { type: Sequelize.BIGINT, allowNull: false },
            podcast_subscribers_count:   { type: Sequelize.BIGINT, allowNull: false},
            podcast_creation_date:       { type: Sequelize.DATE, allowNull: false },
            last_update:                 { type: Sequelize.DATE, allowNull: false },
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('podcast_indices');
    }
};