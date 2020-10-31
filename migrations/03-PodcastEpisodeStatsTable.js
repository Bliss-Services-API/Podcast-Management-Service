'use strict';

/**
 * 
 * Migration of podcast_episodes_stats table in the Database podcasts
 * 
 */
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('podcast_episodes_stats', {
            podcast_title:                  { type: Sequelize.STRING, allowNull: false, primaryKey: true, references: {
                                                model: 'podcast_indices',
                                                key: 'podcast_title',
                                         }, onUpdate: 'cascade', onDelete: 'cascade' },
            episode_number:              { type: Sequelize.BIGINT, allowNull: false },
            episode_title:               { type: Sequelize.STRING, allowNull: false },
            episode_length:              { type: Sequelize.BIGINT, allowNull: false },
            episode_likes:               { type: Sequelize.BIGINT, allowNull: false },
            episode_play_count:          { type: Sequelize.BIGINT, allowNull: false }
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('podcast_episodes_stats');
    }
};