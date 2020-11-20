'use strict';

/**
 * 
 * Returns all the Models in the Server
 * 
 * @param {Sequelize} postgresClient Sequelize Database Connection Object
 */
module.exports = (postgresClient) => {
    const podcastIndexModel = require('./PodcastIndexModel')(postgresClient);
    const podcastEpisodesModel = require('./PodcastEpisodesModel')(postgresClient);
    const podcastEpisodeStatsModel = require('./PodcastEpisodeStatsModel')(postgresClient);
    const podcastSubscriberModel = require('./PodcastSubscriberModel')(postgresClient);

    podcastEpisodeStatsModel.belongsTo(podcastIndexModel, {foreignKey: 'podcast_title'});
    podcastEpisodesModel.belongsTo(podcastIndexModel, {foreignKey: 'podcast_title'});
    podcastSubscriberModel.belongsTo(podcastIndexModel, {foreignKey: 'podcast_title'});
    
    podcastIndexModel.hasOne(podcastSubscriberModel, {foreignKey: 'podcast_title'});
    podcastIndexModel.hasOne(podcastEpisodesModel, {foreignKey: 'podcast_title'});
    podcastIndexModel.hasOne(podcastEpisodeStatsModel, {foreignKey: 'podcast_title'});

    return {
        podcastIndexModel,
        podcastEpisodesModel,
        podcastEpisodeStatsModel,
        podcastSubscriberModel
    };
};