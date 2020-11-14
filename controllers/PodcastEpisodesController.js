'use strict';


/**
 * 
 * Controller for handling Podcast Episode's Management routes in the Bliss App.
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * @param {AWS SDK Object} S3Client S3 Client Object
 * @param {AWS SDK Object} SNSClient SNS Client Object
 *
 */
module.exports = (postgresClient, S3Client, SNSClient) => {

    //Importing Modules
    const models = require('../models')
    const chalk = require('../chalk.console');

    //Initializing Variables
    const Model = models(postgresClient);
    const podcastEpisodeModel = Model.podcastEpisodesModel
    const podcastEpisodeStatsModel = Model.podcastEpisodeStatsModel;

    const podcastEpisodeVideoBucket = process.env.PODCAST_EPISODE_VIDEO_BUCKET;
    const podcastEpisodeVideoOutputBucket = process.env.PODCAST_EPISODE_VIDEO_OUTPUT_BUCKET;
    const podcastEpisodeUploadSNSArn = process.env.PODCAST_EPISODE_UPLOAD_SNS_ARN;
    const podcastImageOutputCDN = process.env.PODCAST_IMAGE_OUTPUT_CDN;

    /**
     * 
     * Send Notification to PubSub Server about the Podcast Created, and handle the 
     * notification service
     * 
     * @param {String} podcastTitle Podcast Title, in which the episode is to be created
     * 
     */
    const sendPodcastEpisodeCreatedNotification = async (podcastTitle, episodeNumber, episodeTitle) => {
        const snsMessage = {
            PodcastTitle: podcastTitle,
            episodeTitle: episodeTitle,
            episodeNumber: episodeNumber,
            Message: 'PODCAST_EPISODE_CREATED'
        };

        const notification = {
            Message: JSON.stringify(snsMessage),
            TopicArn: podcastEpisodeUploadSNSArn
        };

        const snsClientPromise = SNSClient.publish(notification).promise();
        
        return snsClientPromise
            .then((data) => {
                console.log(chalk.success(`Podcast Episode Created Successfully. Message ID: ${data.MessageId}`));
                return [null, true];
            })
            .catch((err) => {
                console.error(chalk.error(`ERR: ${err.message}`));
                return [err, false];
            })
    };

    /**
     * 
     * Function to upload podcast image in the S3
     * 
     * @param {stream} imageStream readStream of the image file, uploaded through the multer
     * @param {string} videoFileName Name of the Podcast Image File (.png)
     * @param {string} imageMIMEType MIME of the image upload
     * @returns {string} URL for downloading podcast image from the CDN (cached)
     * 
     */    
    const uploadEpisodeVideo = async (videoStream, videoFileName, videoMIMEType) => {
        const videoParam = { 
            Bucket: podcastEpisodeVideoBucket,
            Key: videoFileName,
            Body: videoStream,
            ContentType: videoMIMEType
        };

        const s3UploadPromise = S3Client.upload(videoParam).promise();
        return s3UploadPromise.then(() => { return true });
    }

    /**
     * 
     * Function to get the URL for downloading podcast image from the CDN (cached)
     * 
     * @param {string} videoFileName Name of the Podcast Image File (.png)
     * @returns {String} URL for downloading podcast image from the CDN (cached)
     * 
     */
    const getEpisodeDownloadUrl = async videoFileName => {
        const videoExists = await checkEpisodeVideoExists(videoFileName);

        if(videoExists)
            return `${podcastImageOutputCDN}/${videoFileName}`;
        else
            return `No Episode Exists`;
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
    const uploadEpisodeData = async (podcastTitle, episodeTitle, episodeNumber, episodeDescription, episodeCDNLink) => {
        const EpisodeMetaData = {}
        const StatsMetaData = {};
        
        const currTime = Date.now();

        EpisodeMetaData['podcast_title'] = podcastTitle;
        EpisodeMetaData['episode_number'] = episodeNumber;
        EpisodeMetaData['episode_title'] = episodeTitle;
        EpisodeMetaData['episode_description'] = episodeDescription;
        EpisodeMetaData['episode_upload_date'] = currTime;
        EpisodeMetaData['episode_video_link'] = episodeCDNLink;

        StatsMetaData['podcast_title'] = podcastTitle;
        StatsMetaData['episode_number'] = episodeNumber;
        StatsMetaData['episode_title'] = episodeTitle;
        StatsMetaData['episode_length'] = 0;
        StatsMetaData['episode_likes'] = 0;
        StatsMetaData['episode_play_count'] = 0;

        return postgresClient.transaction(async (transactionKey) => {
            await podcastEpisodeModel.create(EpisodeMetaData, {transaction: transactionKey});
            await podcastEpisodeStatsModel.create(StatsMetaData, {transaction: transactionKey});
            return true;
        })
        .catch((err) => {
            throw new Error(err.message);
        });
    };

    /**
     * 
     * Delete the Podcast Image from the S3 Bucket
     * 
     * @param {string} videoFileName Name of the podcast image file uploaded in the S3 Bucket
     * 
     */
    const deletePodcastEpisodeVideo = async (videoFileName) => {
        return new Promise(async (resolve, reject) => {
            try {
                const episodeParam = {
                    Bucket: podcastEpisodeVideoBucket,
                    Key: videoFileName
                };

                S3Client.deleteObject(episodeParam, (err, info) => {
                    if(err){
                        return reject(err);
                    } else {
                        return resolve(true);
                    }
                });
            } catch(err) {
                return reject(err);
            };
        })
    }

    /**
     * 
     * Delete Podcast Episode Video from the S3 Output Bucket
     * 
     * @param {string} videoFileName Name fo the video file uploaded in the S3 Bucket
     */
    const deletePodcastEpisodeOutputVideo = async (videoFileName) => {
        return new Promise(async (resolve, reject) => {
            try {
                const episodeParam = {
                    Bucket: podcastEpisodeVideoOutputBucket,
                    Key: videoFileName
                };

                S3Client.deleteObject(episodeParam, (err, info) => {
                    if(err){
                        return reject(err);
                    } else {
                        return resolve(true);
                    }
                });
            } catch(err) {
                return reject(err);
            };
        })
    }

    /**
     * 
     * Delete Episode of a Podcast
     * 
     * @param {String} podcastTitle Podcast Title, whose episode is to be deleted.
     * @param {String} episodeNumber Episode Number of the podcast
     * @param {String} episodeTitle Episode Title
     */
    const deleteEpisode = async (podcastTitle, episodeNumber, episodeTitle, videoFileName) => {
        await deletePodcastEpisodeVideo(videoFileName);
        await deletePodcastEpisodeOutputVideo(videoFileName);

        return postgresClient.transaction(async (transactionKey) => {
            await podcastEpisodeStatsModel.destroy({
                where: {
                    podcast_title: podcastTitle,
                    episode_number: episodeNumber,
                    episode_title: episodeTitle
                }
            }, {
                transaction: transactionKey
            });
            await podcastEpisodeModel.destroy({
                where: {
                    podcast_title: podcastTitle,
                    episode_number: episodeNumber,
                    episode_title: episodeTitle
                }
            }, {
                transaction: transactionKey
            });
        })
        .catch((err) => {
            throw new Error(err.message);
        });
    };
    
    /**
     * 
     * Get List of All Episodes in a Podcast
     * 
     * @param {String} podcastTitle Podcast Title, whose episode is to be deleted.
     * 
     */
    const getEpisodesOfPodcast = async (podcastTitle) => {
        const episodes = [];

        const episodeResponse = await podcastEpisodeModel.findAll({
            where: {podcast_title : podcastTitle},
            includes: {model: [podcastEpisodeStatsModel]}
        });

        episodeResponse.forEach(episode => episodes.push(episode));

        return episodes;
    }

    /**
     * 
     * Get Data of the Podcast Episode stored in the database
     * 
     * @param {string} podcastTitle Title of the Podcast
     * @param {number} episodeNumber Episode Number of the podcast to be fetched from the database
     * 
     */
    const getEpisodeData = async (podcastTitle, episodeNumber) => {
        const episodes = [];

        const episodeResponse = await podcastEpisodeModel.findAll({
            where: {
                podcast_title : podcastTitle,
                episode_number: episodeNumber,
            },

            includes: {
                model: [podcastEpisodeStatsModel]
            }
        });

        episodeResponse.forEach(episode => episodes.push(episode));

        return episodes;
    }

    /** 
     * 
     * Transmux Input Video into Streamable Output Videos
     * 
    */
    const transmuxEpisode = async (videoStream, videoFileName, videoMIMEType) => {
        const videoParam = { 
            Bucket: podcastEpisodeVideoOutputBucket,
            Key: videoFileName,
            Body: videoStream,
            ContentType: videoMIMEType
        };

        const s3UploadPromise = S3Client.upload(videoParam).promise();
        return s3UploadPromise.then(() => { return true });
    };

    /**
     * 
     * Fetch Stats of an Episode in a Podcast
     * 
     * @param {String} podcastTitle Podcast Title, whose episode is to be deleted.
     * @param {String} episodeNumber Episode Number of the podcast
     * 
     */
    const getEpisodeStats = async (podcastTitle, episodeNumber) => {
        const podcastStats = [];

        const statsResponse = await podcastEpisodeStatsModel.findAll({
            where: {
                podcast_title: podcastTitle, 
                episode_number: episodeNumber
            }
        });

        statsResponse.forEach(stats => podcastStats.push(stats));

        return podcastStats;
    }

    /**
     * 
     * Check if the Episode Data of the Podcast Exists in the Database
     * 
     * @param {string} podcastTitle Title of the Podcast
     * @param {number} episodeNumber Episode Number of the podcast to be fetched from the database
     * 
     */
    const checkEpisodeDataExists = async (podcastTitle, episodeNumber) => {
        const podcastEpisodeRecords = await podcastEpisodeModel.findAll({
            where: {
                podcast_title: podcastTitle,
                episode_number: episodeNumber
            }
        });

        if(podcastEpisodeRecords.length !== 0) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * 
     * Check if the Episode of the Podcast Exists in the S3 Bucket as a video file.
     * 
     * @param {string} videoFileName Name of the Video file uploaded in the S3 Bucket
     * 
     */
    const checkEpisodeVideoExists = async (videoFileName) => {
        return new Promise((resolve, reject) => {
            try {
                const videoParam = {
                    Bucket: podcastEpisodeVideoOutputBucket,
                    Key: videoFileName
                };
                
                S3Client.headObject(videoParam, (err, metadate) => {
                    if(err && err.statusCode === 404) {
                        return resolve(false);
                    } else if(err) {
                        return reject(err);
                    }else {
                        return resolve(true);
                    }
                });
            } catch(err) {
                return reject(err);
            };
        })
    }

    return { 
        checkEpisodeDataExists,
        checkEpisodeVideoExists,
        deleteEpisode,
        getEpisodeData,
        getEpisodeDownloadUrl,
        getEpisodesOfPodcast,
        getEpisodeStats,
        sendPodcastEpisodeCreatedNotification,
        transmuxEpisode,
        uploadEpisodeData,
        uploadEpisodeVideo
    };
}