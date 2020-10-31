'use strict';

/**
 * 
 * Migration of podcast_episodes table in the Database podcasts
 * 
 */
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('podcast_episodes', {
            podcast_title:               { type: Sequelize.STRING, allowNull: false, primaryKey: true, references: {
                                                model: 'podcast_indices',
                                                key: 'podcast_title',
                                        }, onUpdate: 'cascade', onDelete: 'cascade' },
            episode_number:           { type: Sequelize.BIGINT, allowNull: false },
            episode_title:            { type: Sequelize.STRING, allowNull: false },
            episode_description:      { type: Sequelize.TEXT, allowNull: false },
            episode_upload_date:      { type: Sequelize.DATE, allowNull: false },
            episode_video_link:       { type: Sequelize.STRING, allowNull: false },
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('podcast_episodes');
    }
};