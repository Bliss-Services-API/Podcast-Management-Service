'use strict';

/**
 * 
 * Controller for handling Podcasts' Management routes in the Bliss App.
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * @param {Firebase} firebaseBucket Firebase Bucket Reference Object
 * 
 */
module.exports = (databaseConnection, firebaseBucket) => {
    const Model = require('../models')(databaseConnection);
    const crypto = require('crypto');
    const { PubSub } = require('@google-cloud/pubsub');
    const pubSubConfig = require('../config/cloud.publisher.json');
    const pubSubClient = new PubSub({ credentials: pubSubConfig });
    const podcastIndexModel = Model.podcastIndexModel;
    const podcastEpisodeModel = Model.podcastEpisodesModel;
    const podcastEpisodeStatsModel = Model.podcastEpisodeStatsModel;
    const topicName = 'projects/twilight-cloud/topics/PODCAST_INDEX_CREATED_CALLBACK';

    /**
     * 
     * Send Notification to PubSub Server about the Podcast Created, and handle the 
     * notification service
     * 
     * @param {String} podcastTitle Podcast Title, in which the episode is to be created
     * 
     */
    const sendPubSubNotification = async (podcastTitle) => {
        const updateNotification = {
            PODCAST_ID: podcastTitle,
        };

        const attributes = {
            origin: crypto
                    .createHash('sha512')
                    .update('Twilight Podcast Management Service')
                    .digest('hex')
        }

        const PubSubUpdateDataBuffer = Buffer.from(JSON.stringify(updateNotification));
        const messageId = await pubSubClient.topic(topicName).publish(PubSubUpdateDataBuffer, attributes);
        return messageId;
    }

    /**
     * 
     * Delete Podcast, and all of its episodes and stats
     * 
     * @param {String} podcastTitle Podcast Title to be deleted
     * 
     */
    const deletePodcastIndexRecordandImage = async (podcastTitle) => {
        await firebaseBucket.deleteFiles({
            prefix: `podcasts/${podcastTitle}`
        });

        await podcastEpisodeStatsModel.destroy({ where: { podcast_title: podcastTitle } });
        await podcastEpisodeModel.destroy({ where: { podcast_title: podcastTitle } });
        await podcastIndexModel.destroy({ where: { podcast_title: podcastTitle } });

        return podcastTitle;
    }

    /**
     * 
     * Returns the SignedURL for cloud storage bucket file reference, where the podcast image
     * will be uploaded
     * 
     * @param {String} podcastTitle Title of the Podcast, whose image is to be uploaded
     * @param {String} imageType MIME type of the image of the podcast, to be uploaded in the cloud
     */
    const getImageUploadSignedURL = async (podcastTitle, imageType) => {
        const imageFile = firebaseBucket.file(`podcasts/${podcastTitle}/Thumbnail.${imageType}`);

        const signUrlOptions = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 120000,
            contentType: `image/${imageType}`
        };

        const fileExists = await imageFile.exists();
        if(fileExists[0]) {
            throw new Error(`Image Name Already Exists. Choose Different Image`);
        };

        const urlCloudResponse = await imageFile.getSignedUrl(signUrlOptions);
        console.log(urlCloudResponse);
        return urlCloudResponse[0]
    }

    /**
     * 
     * Create the Podcast Index Record in the Database
     * 
     * @param {String} podcastTitle Podcast Title
     * @param {String} podcastDescription Short Description of the Podcast
     * @param {String} podcastHost Name of the Podcast Host
     * @param {String} imageType MIME type of the podcast image uploaded in the cloud storage
     */
    const createNewPodcastRecord = async (podcastTitle, podcastDescription, podcastHost, imageType) => {
        const PodcastMetaData = {};
        
        PodcastMetaData['podcast_title'] = podcastTitle;
        PodcastMetaData['podcast_description'] = podcastDescription;
        PodcastMetaData['podcast_image_link'] = `podcasts/${podcastTitle}/Thumbnail.${imageType}`;
        PodcastMetaData['podcast_host'] = podcastHost;
        PodcastMetaData['podcast_subscribers_count'] = '0';
        PodcastMetaData['podcast_episodes_count'] = '0';
        PodcastMetaData['podcast_creation_date'] = Date.now();
        PodcastMetaData['last_update'] = Date.now();
    
        const BucketResponse = await firebaseBucket.file(PodcastMetaData['podcast_image_link']).exists()

        if(BucketResponse[0]) {
            const DBResponse = await podcastIndexModel.create(PodcastMetaData)
            if(DBResponse){
                return await sendPubSubNotification(podcastTitle);
            } else {
                throw new Error(`Podcast couldn't be created!`);
            }
        } else {
            throw new Error(`Image Hasn't Been Uploaded Yet. Please Upload Image Before Creating Record`);
        }
    }

    /**
     * 
     * Returns all available podcasts in the Database and Cloud Server
     * 
     */
    const getPodcasts = async () => {
        return await podcastIndexModel.findAll();
    }

    return { createNewPodcastRecord, getImageUploadSignedURL, deletePodcastIndexRecordandImage, getPodcasts};
}