'use strict';

/**
 * 
 * Routes/APIs of the Podcast Management Servers.
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * @param {Firebase} firebaseBucket Firebase Bucket Reference Object
 *
 */
module.exports = (postgresClient, S3Client, SNSClient) => {
    
    //Importing Modules
    const fs = require('fs');
    const multer = require('multer');
    const express = require('express');
    const chalk = require('../chalk.console');
    const ControllerConstructor = require('../controllers');

    //Initializing Varibles
    const router = express.Router();
    const Controller = ControllerConstructor(postgresClient, S3Client, SNSClient);
    const podcastIndexMultipart = multer({dest: 'tmp/podcastImages/'});
    const podcastEpisodeMultipart = multer({dest: 'tmp/podcastEpisodes/'});
    const podcastIndexController = Controller.podcastIndexController;
    const podcastEpisodeController = Controller.podcastEpisodeController;
    
    /**
     * 
     * POST Podcast Index in the podcast index table in the database. Pass the following 
     * key/values in the JSON body:
     * 
     * podcast_title
     * podcast_host
     * podcast_description
     * podcast_image_file_name
     * 
     */
    router.post('/podcast/create', 
        podcastIndexMultipart.single('podcast_image'),
        async (req, res) => {
            const podcastTitle = req.body.podcast_title;
            const podcastDescription = req.body.podcast_description;
            const podcastHost = req.body.podcast_host;
            const imageFileName = req.body.podcast_image_file_name;
            const imageOverride = req.body.podcast_image_override || false;

            const imageStream = fs.createReadStream(req.file.path);
            const imageMIMEType = req.file.mimetype;

            try {
                const podcastImageExists = await podcastIndexController.checkImageExist(imageFileName);
                const podcastRecordExists = await podcastIndexController.checkPodcastExists(podcastTitle);

                if(podcastRecordExists){
                    return res.status(400).send({
                        ERR: 'Podcast Index Already Exists',
                        CODE: 'PODCAST_INDEX_EXISTS'
                    });
                }

                else if(podcastImageExists && !imageOverride) {
                    return res.send(400).send({
                        ERR: `Podcast Image Already Exists.`,
                        CODE: 'PODCAST_IMAGE_EXISTS'
                    });
                }

                else {
                    await podcastIndexController.uploadPodcastImage(imageStream, imageFileName, imageMIMEType);
                    const imageCDNDownloadLink = await podcastIndexController.getImageDownloadUrl(imageFileName);
                    const podcastIndexCreated = await podcastIndexController.uploadPodcastDatabaseRecord(podcastTitle, podcastDescription, podcastHost, imageCDNDownloadLink);
                    await podcastIndexController.sendPodcastCreatedNotification(podcastTitle);

                    if(podcastIndexCreated)
                        return res.send({
                            Message: 'DONE',
                            Response: 'Podcast Created Successfully!',
                            CODE: 'PODCAST_CREATED'
                        });
                    else {
                        throw new Error(`Podcast Notification Couldn't be Sent. Recommeded that you delete the incomplete podcast created`);
                    }
                }
            } 
            catch(err) {
                console.error(chalk.error(`ERR: ${err}`));

                return res.send({
                    ERR: `Podcast Index Uploading Failed!`,
                    CODE: 'PODCAST_INDEX_UPLOAD_FAILED',
                    BODY: err.message
                });
            }
            finally {
                fs.unlinkSync(req.file.path);
            }
        }
    );

    /**
     * 
     * GET all the podcast indices in the database
     * 
     */
    router.get('/podcast/list/all', async (req, res) => {
        try {
            const response = await podcastIndexController.getAllPodcasts();
            return res.send({
                Message: 'DONE',
                Response: 'Podcast Fetched Successfully',
                CODE: 'PODCAST_FETCHED',
                Podcast: response
            });
        } catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            return res.send({
                ERR: `Podcast Fetching Failed!`,
                CODE: 'ALL_PODCAST_FETCH_FAILED',
                BODY: err.message
            });
        }
    });

    /**
     * 
     * DEL Podcast Index and all of its episodes and its stats. Pass the following
     * params in the query
     * 
     * podcast_title
     * 
     */
    router.delete('/podcast/delete', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const imageFileName = req.query.podcast_image_file_name;
        
        try {
            await podcastIndexController.deletePodcast(podcastTitle, imageFileName);
            await podcastEpisodeController.deleteEpisode()
            res.send({
                Message: 'DONE',
                Response: 'Podcast Deleted Successfully',
                CODE: 'PODCAST_DELETED_SUCCESSFULLY'
            });
        } catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            return res.send({
                ERR: `Podcast Deletion Failed!`,
                CODE: 'PODCAST_DELETION_FAILED',
                BODY: err.message
            });
        }
    })
    
    /**
     * 
     * GET if Podcast Index Exists. Pass the following params in the query:
     * 
     * podcast_title
     * 
     */
    router.get('/podcast/exists', async (req, res) => {
        const podcastTitle = req.query.podcast_title;

        try {
            const podcastExists = await podcastIndexController.checkPodcastExists(podcastTitle);
            res.send({
                Message: 'DONE',
                Response: 'Podcast Verified Successfully',
                CODE: 'PODCAST_VERIFICATION_SUCCESSFUL',
                'Exists?': podcastExists
            });
        } catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            return res.send({
                ERR: `Podcast Verification Failed!`,
                CODE: 'PODCAST_VERIFICATION_FAILED',
                BODY: err.message
            });
        }
    })


    /**
     * 
     * GET Podcast Index data from the Database. Pass the following params in the query:
     * 
     * podcast_title
     * 
     */
    router.get('/podcast/fetch/data', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        try {
            const response = await podcastIndexController.getPodcastData(podcastTitle);

            return res.send({
                Message: 'DONE',
                Response: 'Podcast Fetched Successfully',
                CODE: 'PODCAST_FETCHED',
                Podcast: response
            });
        } catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            return res.send({
                ERR: `Podcast Fetching Failed!`,
                CODE: 'PODCAST_DATA_FETCH_FAILED',
                BODY: err.message
            });
        }
    });
    

    router.get('/podcast/image/downloadurl', async (req, res) => {

        const imageFileName = req.query.podcast_image_file_name;

        try {
            const url = await podcastIndexController.getImageDownloadUrl(imageFileName);

            res.send({
                Message: 'DONE',
                Response: 'Podcast Image Download URL Fetched Successfully',
                CODE: 'PODCAST_IMAGE_CDN_URL_FETCHED',
                Episodes: url
            });
        }
        catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            return res.send({
                ERR: `Podcast Image CDN URL Fetching Failed!`,
                CODE: 'IMAGE_CDN_URL_FETCH_FAILED',
                BODY: err.message
            });
        }
    })
    /**
     * 
     * POST Podcast Episode in the Database and Upload Video in the S3, transmux the video, and store the
     * output videos in the output S3 Bucket, which is being streamed out through the CDN. Pass the 
     * following key/values in Multipart body:
     * 
     * podcast_title
     * episode_title
     * episode_number
     * episode_description
     * episode_vidoe_file_name
     * episode_video
     * 
     */
    router.post('/episode/upload',
        podcastEpisodeMultipart.single('episode_video'),
        async (req, res) => {

            const podcastTitle = req.body.podcast_title;
            const episodeNumber = req.body.episode_number;
            const episodeTitle = req.body.episode_title;
            const episodeDescription = req.body.episode_description;

            const videoFileName = req.body.episode_video_file_name;
            const videoStream = fs.createReadStream(req.file.path);
            const videoMIMEType = req.file.mimetype;

            try {
                const episodeVideoExists = await podcastEpisodeController.checkEpisodeVideoExists(videoFileName);
                const episodeDataExists = await podcastEpisodeController.checkEpisodeDataExists(podcastTitle, episodeNumber);
                const podcastExists = await podcastIndexController.checkPodcastExists(podcastTitle);

                if(podcastExists) {
                    if(episodeDataExists) {
                        return res.status(400).send({
                            ERR: 'Podcast Episode Record Already Exists',
                            CODE: 'PODCAST_EPISODE_DATA_EXISTS'
                        });
                    }
                    else if(episodeVideoExists) {
                        return res.status(400).send({
                            ERR: `Podcast Video Already Exists in Bucket.`,
                            CODE: 'PODCAST_EPISODE_VIDEO_EXISTS'
                        });
                    }
                    else {
                        podcastEpisodeController.uploadEpisodeVideo(videoStream, videoFileName, videoMIMEType);
                        await podcastEpisodeController.transmuxEpisode(videoStream, videoFileName, videoMIMEType);

                        const podcastEpisodeDownloadCDNUrl = await podcastEpisodeController.getEpisodeDownloadUrl(videoFileName);
                        const podcastEpisodeUploaded = await podcastEpisodeController.uploadEpisodeData(podcastTitle, episodeTitle, episodeNumber, episodeDescription, podcastEpisodeDownloadCDNUrl);
                        

                        if(podcastEpisodeUploaded) {
                            const notificationSent = await podcastEpisodeController.sendPodcastEpisodeCreatedNotification(podcastTitle, episodeNumber, episodeTitle);
                            return res.send({
                                Message: 'DONE',
                                Response: 'Podcast Created Successfully!',
                                CODE: 'PODCAST_CREATED',
                                NotificationSent: notificationSent[1],
                                NotificationError: notificationSent[0]
                            });
                        } else {
                            throw new Error(`Podcast Notification Couldn't be Sent`);
                        }
                    }
                }
                else {
                    return res.send({
                        ERR: `Podcast Index Uploading Failed!`,
                        CODE: 'PODCAST_INDEX_UPLOAD_FAILED',
                        BODY: `Podcast ${podcastTitle} Doesn't Exists!`
                    });    
                }
            }
            catch(err) {
                console.error(chalk.error(`ERR: ${err}`));

                return res.send({
                    ERR: `Podcast Index Uploading Failed!`,
                    CODE: 'PODCAST_INDEX_UPLOAD_FAILED',
                    BODY: err.message
                });
            }
            finally {
                fs.unlinkSync(req.file.path);
            }
        }
    );

    /**
     * 
     * DEL Podcast Episode. Pass the following params in query:
     * 
     * podast_title
     * episode_title
     * episode_number
     * episode_video_file_name
     * 
     */
    router.delete('/episode/delete', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const episodeTitle = req.query.episode_title;
        const episodeNumber = req.query.episode_number;
        const videoFileName = req.query.episode_video_file_name;

        try {
            await podcastEpisodeController.deleteEpisode(podcastTitle, episodeNumber, episodeTitle, videoFileName)
            
            res.send({
                Message: 'DONE',
                Response: 'Episode Deleted Successfully',
                CODE: 'PODCAST_EPISODE_DELETED'
            });
        }
        catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            res.send({
                ERR: 'Podcast Deletion Failed',
                CODE: 'PODCAST_EPISODE_DELETION_FAILED',
                BODY: err.message
            });
        }
    });

    /**
     * 
     * GET list of all episodes in the podcast. Pass the following params in query:
     * 
     * podcast_title
     * 
     */
    router.get('/episode/list', async (req, res) => {
        const podcastTitle = req.query.podcast_title;

        try {
            const response = await podcastEpisodeController.getEpisodesOfPodcast(podcastTitle);

            res.send({
                Message: 'DONE',
                Response: 'Episodes Fetched Successfully',
                CODE: 'EPISODE_FETCHED',
                Episodes: response
            });
        }
        catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            res.send({
                ERR: 'Episodes Fetch Failed',
                CODE: 'EPISODE_FETCH_FAILED',
                BODY: err.message
            });
        }
    });

    /**
     * 
     * GET Stats of a Podcast Episode. Pass the following params in query:
     * 
     * podast_title
     * episode_number
     * 
     */
    router.get('/episode/stats', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const episodeNumber = req.query.episode_number;

        try {
            const response = await podcastEpisodeController.getEpisodeStats(podcastTitle, episodeNumber);

            res.send({
                Message: 'DONE',
                Response: 'Episodes Stats Fetched Successfully',
                CODE: 'STATS_FETCHED',
                Episodes: response
            });
        } catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            res.send({
                ERR: 'Episodes Stats Fetch Failed',
                CODE: 'STATS_FETCH_FAILED',
                BODY: err.message
            });
        }
    })
    

    /**
     * 
     * GET data of an episodes in the podcast. Pass the following params in query:
     * 
     * podcast_title
     * episode_number
     * 
     */
    router.get('/episode/data', async (req, res) => {

        const podcastTitle = req.query.podcast_title;
        const episodeNumber = req.query.episode_number;
        
        try {
            const response = await podcastEpisodeController.getEpisodeData(podcastTitle, episodeNumber);
            
            res.send({
                Message: 'DONE',
                Response: 'Episode Data Fetched Successfully',
                CODE: 'EPISODE_DATA_FETCHED',
                Episodes: response
            });
        }
        catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            res.send({
                ERR: 'Episodes Fetch Failed',
                CODE: 'EPISODE_DATA_FETCH_FAILED',
                BODY: err.message
            });
        }
    })


    router.get('/episode/downloadurl', async (req, res) => {
        const episodeVideoFileName = req.query.episode_video_file_name;
        
        try {
            const url = await podcastEpisodeController.getEpisodeDownloadUrl(episodeVideoFileName);
            res.send({
                Message: 'DONE',
                Response: 'Episodes Download URL Fetched Successfully',
                CODE: 'EPISODE_CDN_URL_FETCHED',
                Episodes: url
            });
        }
        catch(err) {
            console.error(chalk.error(`ERR: ${err}`));
            return res.send({
                ERR: `Podcast Episode CDN URL Fetching Failed!`,
                CODE: 'EPISODE_CDN_URL_FETCH_FAILED',
                BODY: err.message
            });
        }
    })

    return router;
}