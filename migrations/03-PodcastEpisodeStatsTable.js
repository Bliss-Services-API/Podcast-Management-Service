'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('podcast_episodes_stats', {
            podcast_id:                  { type: Sequelize.STRING(64), allowNull: false, primaryKey: true, references: {
                                                model: 'podcast_indices',
                                                key: 'podcast_id',
                                         }, onUpdate: 'cascade', onDelete: 'cascade' },
            episode_number:              { type: Sequelize.BIGINT, allowNull: false, primaryKey: true },
            episode_title:               { type: Sequelize.STRING, allowNull: false, primaryKey: true },
            episode_length:              { type: Sequelize.BIGINT, allowNull: false },
            episode_likes:               { type: Sequelize.BIGINT, allowNull: false},
            episode_play_count:          { type: Sequelize.BIGINT, allowNull: false}
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('podcast_episodes_stats');
    }
};