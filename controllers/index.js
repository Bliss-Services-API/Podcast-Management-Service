module.exports = (postgresClient, S3Client, SNSClient, CloudFront) => {
    const podcastIndexController = require('./PodcastIndexController')(postgresClient, S3Client, SNSClient, CloudFront);
    const podcastEpisodeController = require('./PodcastEpisodesController')(postgresClient, S3Client, SNSClient, CloudFront);

    return {
        podcastEpisodeController,
        podcastIndexController
    };
}