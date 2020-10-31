'use strict';

/**
 * 
 * Returns all the Models in the Server
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 */
module.exports = (databaseConnection) => {
    const podcastIndexModel = require('./PodcastIndexModel')(databaseConnection);
    const podcastEpisodesModel = require('./PodcastEpisodesModel')(databaseConnection);
    const podcastEpisodeStatsModel = require('./PodcastEpisodeStatsModel')(databaseConnection);

    podcastEpisodeStatsModel.belongsTo(podcastIndexModel, {foreignKey: 'podcast_title'});
    podcastEpisodesModel.belongsTo(podcastIndexModel, {foreignKey: 'podcast_title'});
    
    podcastIndexModel.hasOne(podcastEpisodesModel, {foreignKey: 'podcast_title'});
    podcastIndexModel.hasOne(podcastEpisodeStatsModel, {foreignKey: 'podcast_title'});

    return {
        podcastIndexModel,
        podcastEpisodesModel,
        podcastEpisodeStatsModel
    };
};