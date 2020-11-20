'use strict';

/**
 * 
 * Migration of podcast_episodes_stats table in the Database podcasts
 * 
 */
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('podcast_subscribers', {
            podcast_title:                  { type: Sequelize.STRING, allowNull: false, primaryKey: true, references: {
                                                    model: 'podcast_indices',
                                                    key: 'podcast_title',
                                            }, onUpdate: 'cascade', onDelete: 'cascade' },
            client_id:                      { type: Sequelize.STRING, primaryKey: true },
            subscription_date:              { type: Sequelize.DATE }
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('podcast_subscribers');
    }
};