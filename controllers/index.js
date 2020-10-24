module.exports = (DBConnection, firebaseBucket) => {
    const PodcastEpisodesController = require('./PodcastEpisodesController');
    const PodcastIndexController = require('./PodcastIndexController');
    
    return {
        PodcastEpisodesController,
        PodcastIndexController,
    };
}