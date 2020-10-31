'use strict';


/**
 * 
 * Controller for handling Podcast Episode's Management routes in the Bliss App.
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * @param {Firebase} firebaseBucket Firebase Bucket Reference Object
 *
 */
module.exports = (databaseConnection, firebaseBucket) => {
    const Model = require('../models')(databaseConnection);
    const crypto = require('crypto');
    const { PubSub } = require('@google-cloud/pubsub');
    const PubSubConfig = require('../config/cloud.publisher.json');
    const pubSubClient = new PubSub({ credentials: PubSubConfig });
    const podcastEpisodesModel = Model.podcastEpisodesModel;
    const podcastIndexModel = Model.podcastIndexModel;
    const podcastEpisodeStatsModel = Model.podcastEpisodeStatsModel;
    const topicName = 'projects/twilight-cloud/topics/PODCAST_EPISODE_CREATE_CALLBACK';

    
    /**
     * 
     * Send Notification to PubSub Server about the Episode Created, which will further process
     * the video, and handle the notification service
     * 
     * @param {String} podcastTitle Podcast Title, in which the episode is to be created
     * @param {String} episodeTitle Episode Title
     * 
     */
    const sendPubSubNotification = async (podcastTitle, episodeNumber, episodeTitle) => {
        const updateNotification = {
            PODCAST_TITLE: podcastTitle,
            EPISODE_NUMBER: episodeNumber,
            EPISODE_TITLE: episodeTitle
        };

        const attributes = {
            origin: crypto
                    .createHash('sha512')
                    .update('Bliss LLC.')
                    .digest('hex')
        }

        const PubSubUpdateDataBuffer = Buffer.from(JSON.stringify(updateNotification));
        const messageId = await pubSubClient.topic(topicName).publish(PubSubUpdateDataBuffer, attributes);
        return messageId;
    }

    /**
     * 
     * Get Episode Video Uploading Cloud Storage Bucket SignedURL
     * 
     * @param {String} podcastTitle Podcast Title, in which the episode is to be created
     * @param {String} episodeNumber Episode Number
     * @param {String} videoFileName File name of the Podcast Episode
     * 
     */
    const getEpisodeUploadSignedURL = async (podcastTitle, episodeNumber, episodeTitle) => {
        const videoFile = firebaseBucket.file(`podcasts/${podcastTitle}/episodes/input/${episodeNumber}-${episodeTitle}.avi`);

        const signUrlOptions = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 240000,
            contentType: `video/x-msvideo`
        };

        const podcastExists = await podcastIndexModel.findAll({where: {podcast_title: podcastTitle}});
        if(podcastExists.length !== 0) {
            const fileExists = await videoFile.exists();
            if(fileExists[0]) {
                throw new Error(`Video Already Exists.`);
            };

            const urlCloudStorageResponse = await videoFile.getSignedUrl(signUrlOptions);
            return urlCloudStorageResponse[0];
        } else {
            throw new Error(`Podcast Doens't Exists Yet! Create Podcast First`);
        }
    }

    /**
     * 
     * Upload New Episode of a Podcast, in the podcasts Database
     * 
     * @param {String} podcastTitle Podcast Title, in which the episode is to be created
     * @param {String} episodeTitle Episode Title
     * @param {String} episodeNumber Episode Number
     * @param {String} episodeDescription Short Description of Episode
     * 
     */
    const uploadNewEpisode = async (podcastTitle, episodeTitle, episodeNumber, episodeDescription) => {
        const EpisodeMetaData = {}

        EpisodeMetaData['podcast_title'] = podcastTitle;
        EpisodeMetaData['episode_number'] = episodeNumber;
        EpisodeMetaData['episode_title'] = episodeTitle;
        EpisodeMetaData['episode_description'] = episodeDescription;
        EpisodeMetaData['episode_upload_date'] = Date.now();
        EpisodeMetaData['episode_video_link'] = `podcasts/${podcastTitle}/episodes/input/${episodeNumber}-${episodeTitle}.avi`;
    
        const BucketResponse = await firebaseBucket.file(EpisodeMetaData['episode_video_link']).exists();

        if(BucketResponse[0]) {
            const DBResponse = await podcastEpisodesModel.create(EpisodeMetaData)
            if(DBResponse){                    
                return sendPubSubNotification(podcastTitle, episodeTitle);
            }
        } else {
            throw new Error(`Video Hasn't Been Uploaded Yet. Please Upload Video Before Creating Record`);
        }
    };
    
    /**
     * 
     * Delete Episode of a Podcast
     * 
     * @param {String} podcastTitle Podcast Title, whose episode is to be deleted.
     * @param {String} episodeNumber Episode Number of the podcast
     * @param {String} episodeTitle Episode Title
     */
    const deleteEpisode = async (podcastTitle, episodeNumber, episodeTitle) => {
        const episodeVideoLink = firebaseBucket.file(`podcasts/${podcastTitle}/episodes/input/${episodeNumber}-${episodeTitle}.avi`);

        await episodeVideoLink.delete();
        await podcastEpisodesModel.destroy({
            where: {
                podcast_name: podcastName,
                episode_number: episodeNumber,
                episode_title: episodeTitle
            }
        });

        return episodeTitle;
    };
    
    /**
     * 
     * Get List of All Episodes in a Podcast
     * 
     * @param {String} podcastTitle Podcast Title, whose episode is to be deleted.
     * 
     */
    const getEpisodesOfPodcast = async (podcastTitle) => {
        const response = await podcastEpisodesModel.findAll({
            where: {podcast_title : podcastTitle},
            includes: {model: [podcastEpisodeStatsModel]}
        });
        return response;
    }

    /**
     * 
     * Fetch Stats of an Episode in a Podcast
     * 
     * @param {String} podcastTitle Podcast Title, whose episode is to be deleted.
     * @param {String} episodeNumber Episode Number of the podcast
     * @param {String} episodeTitle Episode Title
     * 
     */
    const getStatsOfEpisode = async (podcastTitle, episodeNumber, episodeTitle) => {
        return await podcastEpisodeStatsModel.findAll({
            where: {
                podcast_title: podcastTitle, 
                episode_number: episodeNumber, 
                episode_title: episodeTitle
            }
        });
    }

    return { uploadNewEpisode, deleteEpisode, getEpisodesOfPodcast, getEpisodeUploadSignedURL, getStatsOfEpisode };
}