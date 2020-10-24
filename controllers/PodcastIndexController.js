'use strict';

const Model = require('../models');
const crypto = require('crypto');
const { PubSub } = require('@google-cloud/pubsub');
const PubSubConfig = require('../config/cloud.publisher.json');
const pubSubClient = new PubSub({ credentials: PubSubConfig });

const sendPubSubNotification = async (podcastId, TopicName) => {
    const updateNotification = {
        PODCAST_ID: podcastId,
        MESSAGE: `PODCAST_CREATED`
    };

    const attributes = {
        origin: crypto
                .createHash('sha512')
                .update('Twilight Podcast Management Service')
                .digest('hex')
    }

    const PubSubUpdateDataBuffer = Buffer.from(JSON.stringify(updateNotification));
    const messageId = await pubSubClient.topic(TopicName).publish(PubSubUpdateDataBuffer, attributes);
    return messageId;
}

module.exports = (pgConnection, firebaseBucket) => {
    const PodcastIndexModel = Model(pgConnection).PodcastIndexModel;
    const TopicName = 'projects/twilight-cloud/topics/PODCAST_UPDATE';


    const deletePodcastIndexRecordandImage = async (podcastTitle) => {
        const podcastId = crypto.createHash('sha256').update(podcastTitle).digest('hex');

        try {
            await firebaseBucket.deleteFiles({
                prefix: `podcasts/${podcastId}`
            });
            console.log('Image Deleted');

            await PodcastIndexModel.destroy({where: {podcast_id: podcastId}})

            console.log(`Record Deleted`);
            return `DB Record and Image Deleted`;
        }
        catch(err) {
            console.error(`Error Deleting Record and Image: ${err}`);
            return `Error Deleting Record and Image: ${err}`;
        }
        
    }


    const getImageUploadSignedURL = async (podcastTitle, imageType) => {
        const podcastId = crypto.createHash('sha256').update(podcastTitle).digest('hex');
        const imageFile = firebaseBucket.file(`podcasts/${podcastId}/MainImage.${imageType}`);

        const signUrlOptions = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 120000,
            contentType: `image/${imageType}`
        };

        try {
            const fileExists = await imageFile.exists();
            if(fileExists[0]) {
                return `Image Name Already Exists. Choose Different Image`;
            };

            return imageFile
                .getSignedUrl(signUrlOptions)
                .then((urlResponse) => { return urlResponse[0] })
                .catch((err) => { return err });
        }
        catch(err) {
            console.error(`Error Generating SignedURL! Try Again: ${err}`)
            return (`Error Generating SignedURL! ${err}`)
        }
    }


    const createNewPodcastRecord = async (podcastTitle, podcastDescription, podcastHost, imageType) => {
        const PodcastMetaData = {};
        
        PodcastMetaData['podcast_id'] = crypto.createHash('sha256').update(podcastTitle).digest('hex');
        PodcastMetaData['podcast_title'] = podcastTitle;
        PodcastMetaData['podcast_description'] = podcastDescription;
        PodcastMetaData['podcast_image_link'] = `podcasts/${PodcastMetaData['podcast_id']}/MainImage.${imageType}`;
        PodcastMetaData['podcast_host'] = podcastHost;
        PodcastMetaData['podcast_subscribers_count'] = '0';
        PodcastMetaData['podcast_episodes_count'] = '0';
        PodcastMetaData['podcast_creation_date'] = Date.now();
        PodcastMetaData['last_update'] = Date.now();
    
        try {
            const BucketResponse = await firebaseBucket.file(PodcastMetaData['podcast_image_link']).exists()

            if(BucketResponse[0]) {
                const DBResponse = await PodcastIndexModel.create(PodcastMetaData)
                if(DBResponse){
                    try {
                        const pubSubAck = await sendPubSubNotification(PodcastMetaData['podcast_id'], TopicName);
                        console.log(`Message ${pubSubAck} published.`);
                        return `Podcast Created Successfully!`;
                    }
                    catch(err) { 
                        return `Error: ${err}`
                    }

                } else {
                    return `Podcast couldn't be created! Try Again.`;
                }
            }
            else {
                console.log(`Image Hasn't Been Uploaded Yet. Please Upload Image Before Creating Record`);
                return `Image Hasn't Been Uploaded Yet. Please Upload Image Before Creating Record`;
            }
        }
        catch(err) {
            console.error(`Error Creating Podcast! ${err}`);
            return `Error Creating Podcast! ${err}`;
        }
    }

    
    const getPodcasts = async () => {
        try {
            return await PodcastIndexModel.findAll();
        }
        catch(err) {
            console.error(`Error Fetching All Podcasts! ${err}`);
            return `Error Fetching All Podcasts! ${err}`;
        }
    }

    return { createNewPodcastRecord, getImageUploadSignedURL, deletePodcastIndexRecordandImage, getPodcasts};
}