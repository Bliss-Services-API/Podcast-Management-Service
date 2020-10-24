'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('podcast_episodes', {
            podcast_id:               { type: Sequelize.STRING(64), allowNull: false, primaryKey: true, references: {
                                                model: 'podcast_indices',
                                                key: 'podcast_id',
                                        }, onUpdate: 'cascade', onDelete: 'cascade' },
            episode_number:           { type: Sequelize.BIGINT, allowNull: false, primaryKey: true },
            episode_title:            { type: Sequelize.STRING, allowNull: false, primaryKey: true },
            episode_description:      { type: Sequelize.TEXT, allowNull: false },
            episode_upload_date:      { type: Sequelize.DATE, allowNull: false },
            episode_video_link:       { type: Sequelize.STRING, allowNull: false },
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('podcast_episodes');
    }
};