'use strict';

const Model = require('../models');
const crypto = require('crypto');
const { PubSub } = require('@google-cloud/pubsub');
const PubSubConfig = require('../config/cloud.publisher.json');
const pubSubClient = new PubSub({ credentials: PubSubConfig });

module.exports = (pgConnection, firebaseBucket) => {
    const PodcastEpisodesModel = Model(pgConnection).PodcastEpisodesModel;
    const PodcastIndexModel = Model(pgConnection).PodcastIndexModel;
    const TopicName = 'projects/twilight-cloud/topics/PODCAST_UPDATE';

    
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

    const getEpisodeUploadSignedURL = async (podcastTitle, episodeNumber, videoFileName, videoType) => {
        const podcastId = crypto.createHash('sha256').update(podcastTitle).digest('hex');
        const videoFile = firebaseBucket.file(`podcasts/${podcastId}/episodes/${episodeNumber}:${videoFileName}.${videoType}`);

        const signUrlOptions = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 120000,
            contentType: `image/${videoType}`
        };

        try {
            const fileExists = await videoFile.exists();
            if(fileExists[0]) {
                return `Video Already Exists.`;
            };

            return videoFile
                .getSignedUrl(signUrlOptions)
                .then((urlResponse) => { return urlResponse[0] })
                .catch((err) => { return err });
        }
        catch(err) {
            console.error(`Error Generating SignedURL! Try Again: ${err}`)
            return (`Error Generating SignedURL! ${err}`)
        }
    }

    const uploadNewEpisode = async (podcastTitle, episodeTitle, episodeNumber, episodeDescription, videoFileName, videoType) => {
        const EpisodeMetaData = {}
        
        EpisodeMetaData['podcast_id'] = crypto.createHash('sha256').update(podcastTitle).digest('hex');
        EpisodeMetaData['episode_number'] = episodeNumber;
        EpisodeMetaData['episode_title'] = episodeTitle;
        EpisodeMetaData['episode_description'] = episodeDescription;
        EpisodeMetaData['episode_upload_date'] = Date.now();
        EpisodeMetaData['episode_video_link'] = `podcasts/${EpisodeMetaData['podcast_id']}/episodes/${episodeNumber}:${videoFileName}.${videoType}`;
    
        try {
            const BucketResponse = await firebaseBucket.file(EpisodeMetaData['episode_video_link']).exists();

            if(BucketResponse[0]) {
                const DBResponse = await PodcastEpisodesModel.create(EpisodeMetaData)
                if(DBResponse){
                    console.log(`Episode Recorded Successfully!`);
                    
                    try {
                        const pubSubAck = sendPubSubNotification(EpisodeMetaData['podcast_id'], TopicName);
                        console.log(`Message ${pubSubAck} published.`);
                        return `Episode Created Successfully!`;
                    }
                    catch(err) {
                        return `Error: ${err}`
                    }

                } else {
                    console.log(`Episode couldn't be created! Try Again.`);
                    return `Episode couldn't be created! Try Again.`;
                }
            }
            else {
                console.log(`Video Hasn't Been Uploaded Yet. Please Upload Video Before Creating Record`);
                return `Video Hasn't Been Uploaded Yet. Please Upload Video Before Creating Record`;
            }
        }
        catch(err) {
            console.error(`Error Creating Episode! ${err}`);
            return `Error Creating Episode! ${err}`;
        }
    };
    
    const deleteEpisode = async (podcastTitle, episodeNumber, episodeTitle, videoFileName, videoType) => {
        const podcastId = crypto.createHash('sha256').update(podcastTitle).digest('hex');
        const episodeVideoLink = firebaseBucket.file(`podcasts/${podcastId}/episodes/${episodeNumber}:${videoFileName}.${videoType}`);

        try {
            await episodeVideoLink.delete();
            console.log('Video Deleted');

            await PodcastEpisodesModel.destroy({
                where: {
                    podcast_id: podcastId,
                    episode_number: episodeNumber,
                    episode_title: episodeTitle
                }
            });

            console.log(`Record Deleted`);
            return `DB Record and Video Deleted`;
        }
        catch(err) {
            console.error(`Error Deleting Record and Video: ${err}`);
            return `Error Deleting Record and Video: ${err}`;
        }
    };
    
    
    const getEpisodesOfPodcast = async (podcastTitle) => {
        try {
            const response = await PodcastIndexModel.findAll(
                { attributes: ['podcast_id']},
                { where: { podcast_title: podcastTitle }
            })
            const podcastId = response[0]['dataValues']['podcast_id'];
            return await PodcastEpisodesModel.findAll({where: {podcast_id : podcastId}});
        }
        catch(err) {
            console.error(`Error Fetching Episodes: ${err}`);
            return `Error Fetching Episodes: ${JSON.stringify(err)}`;
        };
    }

    return { uploadNewEpisode, deleteEpisode, getEpisodesOfPodcast, getEpisodeUploadSignedURL };
}