'use strict';

/**
 * 
 * Controller for handling Podcasts' Management routes in the Bliss App.
 * 
 * @param {Sequelize} postgresClient Sequelize Database Connection Object
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

    const podcastIndexModel = Model.podcastIndexModel;
    const podcastEpisodeModel = Model.podcastEpisodesModel;
    const podcastEpisodeStatsModel = Model.podcastEpisodeStatsModel;
    const podcastSubscriberModel = Model.podcastSubscriberModel;

    const podcastImageBucket = process.env.PODCAST_IMAGE_BUCKET;
    const podcastUploadSNSArn = process.env.PODCAST_UPLOAD_SNS_ARN;
    const podcastVideoOutputCDN = process.env.PODCAST_VIDEO_OUTPUT_CDN;

     /**
     * 
     * Function to get the URL for downloading podcast image from the CDN (cached)
     * 
     * @param {string} imageFileName Name of the Podcast Image File (.png)
     * @returns {String} URL for downloading podcast image from the CDN (cached)
     * 
     */
    const getImageDownloadUrl =  async imageFileName => {
        const imageExists = await checkImageExist(imageFileName);

        if(imageExists) {
            const expire = 5 * 60 * 1000;

            const signedUrl = CloudFront.getSignedUrl({
                    expires: Math.floor((Date.now() + expire)/1000),
                });
        
            return {signedUrl, expireTime};
        } else {
            return `No Image Exists`;
        }
    }

    /**
     * 
     * Function to Upload Podcast Image in the S3 Bucket
     * 
     * @param {stream} imageStream readStream of the image file, uploaded through the multer
     * @param {string} imageFileName Name of the Podcast Image File (.png)
     * @param {string} imageMIMEType MIME of the image upload
     * @returns {string} URL for downloading podcast image from the CDN (cached)
     * 
     */    
    const uploadPodcastImage = async (imageStream, imageFileName, imageMIMEType) => {
        const imageParam = { 
            Bucket: podcastImageBucket,
            Key: imageFileName,
            Body: imageStream,
            ContentType: imageMIMEType
        };

        const s3UploadPromise = S3Client.upload(imageParam).promise();
        return s3UploadPromise.then(() => { return true });
    }

    /**
     * 
     * Function to Check Whether Podcast Image exists on the S3 Bucket
     * 
     * @param {string} imageFileName Name of the Podcast Image File (.png)
     * @returns {Promise} Resolve contains true (image exists), and reject contains error
     * or false (image doesn't exists)
     * 
     */
    const checkImageExist = async imageFileName => {
        return new Promise((resolve, reject) => {
            try {
                const imageParam = {
                    Bucket: podcastImageBucket,
                    Key: imageFileName
                };
                
                S3Client.headObject(imageParam, (err, metadate) => {
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
    
    /**
     * 
     * Create the Podcast Index Record in the Database
     * 
     * @param {String} podcastTitle Podcast Title
     * @param {String} podcastDescription Short Description of the Podcast
     * @param {String} podcastHost Name of the Podcast Host
     * @param {String} podcastImageCDNLink Link for CDN pointing to the podcast image uploaded in the 
     * S3 Bucket
     */
    const uploadPodcastDatabaseRecord = async (podcastTitle, podcastDescription, podcastHost, podcastImageCDNLink) => {
        const PodcastMetaData = {};
        const currTime = Date.now();
        
        PodcastMetaData['podcast_title'] = podcastTitle;
        PodcastMetaData['podcast_description'] = podcastDescription;
        PodcastMetaData['podcast_image_link'] = podcastImageCDNLink;
        PodcastMetaData['podcast_host'] = podcastHost;
        PodcastMetaData['podcast_subscribers_count'] = '0';
        PodcastMetaData['podcast_episodes_count'] = '0';
        PodcastMetaData['podcast_creation_date'] = currTime;
        PodcastMetaData['last_update'] = currTime;
    
        await podcastIndexModel.create(PodcastMetaData);
        // return await sendPubSubNotification(podcastTitle)
        return true;
    }

    /**
     * 
     * Returns all available podcasts in the Database and Cloud Server
     * 
     */
    const getAllPodcasts = async () => {
        const podcasts = [];
        const podcastRecords = await podcastIndexModel.findAll();
        
        podcastRecords.forEach(podcast => podcasts.push(podcast['dataValues']));

        if(podcasts.length !== 0)
            return podcasts;
        else {
            return 'No Podcast Exists'
        }
    }

    /**
     * 
     * Check if podcast exists in the record, whose title matches with the provided
     * podcastTitle argument.
     * 
     * @param {String} podcastTitle Podcast Title, whose data is to be fetched
     * @returns false, if no such podcast exists. Else, returns true
     * 
     */
    const checkPodcastExists = async (podcastTitle) => {
        const podcastRecords = await podcastIndexModel.findAll({
            where: {
                podcast_title: podcastTitle
            }
        });

        if(podcastRecords.length !== 0) {
            return true;
        }
        else {
            return false;
        }
    }
    
    /**
     * 
     * Return the Podcast Record from the Database, whose title matches with the provided
     * podcastTitle argument.
     * 
     * @param {String} podcastTitle Podcast Title, whose data is to be fetched
     * @returns false, if no such podcast exists. Else, podcast data
     * 
     */
    const getPodcastData = async (podcastTitle) => {
        const podcasts = [];
        const podcastRecords = await podcastIndexModel.findAll({
            where: {
                podcast_title: podcastTitle
            }
        });

        podcastRecords.forEach(podcast => podcasts.push(podcast['dataValues']));
        return podcasts;
    }

    /**
     * 
     * Delete Podcast, and all of its episodes and stats
     * 
     * @param {String} podcastTitle Podcast Title to be deleted
     * 
     */
    const deletePodcast = async (podcastTitle, imageFileName) => {
        await deletePodcastImage(imageFileName);

        await podcastEpisodeStatsModel.destroy({ where: { podcast_title: podcastTitle } });
        await podcastEpisodeModel.destroy({ where: { podcast_title: podcastTitle } });
        await podcastIndexModel.destroy({ where: { podcast_title: podcastTitle } });
        
        return podcastTitle;
    }

    /**
     * 
     * Delete the Podcast Image from the S3 Bucket
     * 
     * @param {string} imageFileName Name of the podcast image file uploaded in the S3 Bucket
     * 
     */
    const deletePodcastImage = async (imageFileName) => {
        return new Promise(async (resolve, reject) => {
            try {
                const imageParam = {
                    Bucket: podcastImageBucket,
                    Key: imageFileName
                };

                S3Client.deleteObject(imageParam, (err, info) => {
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
    };

    const subscribePodcast = async (clientId, podcastTitle) => {
        await podcastSubscriberModel.create({
            client_id: clientId,
            podcast_title: podcastTitle,
            subscription_date: `${new Date.now()}`
        });
    };

    const unsubscribePodcast = async (clientId, podcastTitle) => {
        await podcastSubscriberModel.destroy({
            where: {
                client_id: clientId,
                podcast_title: podcastTitle,
            }
        });
    };

    /**
     * 
     * Send Notification to PubSub Server about the Podcast Created, and handle the 
     * notification service
     * 
     * @param {String} podcastTitle Podcast Title, in which the episode is to be created
     * 
     */
    const sendPodcastCreatedNotification = async (podcastTitle) => {
        const snsMessage = {
            PodcastTitle: podcastTitle,
            Message: 'PODCAST_CREATED'
        };

        const updateNotification = {
            Message: JSON.stringify(snsMessage),
            TopicArn: podcastUploadSNSArn
        };

        const snsClientPromise = SNSClient.publish(updateNotification).promise();
        
        return snsClientPromise
            .then((data) => {
                console.log(chalk.success(`Podcast Created Successfully. Message ID: ${data.MessageId}`));
                return true;
            })
    };

    return { 
        deletePodcast,
        getImageDownloadUrl,
        getAllPodcasts,
        getPodcastData,
        checkImageExist,
        uploadPodcastImage,
        checkPodcastExists,
        subscribePodcast,
        unsubscribePodcast,
        uploadPodcastDatabaseRecord,
        sendPodcastCreatedNotification
    };
}