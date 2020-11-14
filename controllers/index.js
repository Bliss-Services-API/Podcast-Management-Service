module.exports = (postgresClient, S3Client, SNSClient) => {
    const podcastIndexController = require('./PodcastIndexController')(postgresClient, S3Client, SNSClient);
    const podcastEpisodeController = require('./PodcastEpisodesController')(postgresClient, S3Client, SNSClient);

    return {
        podcastEpisodeController,
        podcastIndexController
    };
}