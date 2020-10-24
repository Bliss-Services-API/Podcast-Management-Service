module.exports = (pgConnection) => {
    const PodcastIndexModel = require('./PodcastIndexModel')(pgConnection);
    const PodcastEpisodesModel = require('./PodcastEpisodesModel')(pgConnection);

    PodcastEpisodesModel.belongsTo(PodcastIndexModel, {foreignKey: 'podcast_id'});
    PodcastIndexModel.hasOne(PodcastEpisodesModel, {foreignKey: 'podcast_id'});

    return {
        PodcastIndexModel,
        PodcastEpisodesModel
    };
};