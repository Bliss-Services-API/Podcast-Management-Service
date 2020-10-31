'use strict';

/**
 * 
 * Routes/APIs of the Podcast Management Servers.
 * 
 * @param {Sequelize} databaseConnection Sequelize Database Connection Object
 * @param {Firebase} firebaseBucket Firebase Bucket Reference Object
 *
 */
module.exports = (databaseConnection, firebaseBucket) => {
    const router = require('express').Router();
    const chalk = require('../chalk.console');
    const indexController = require('../controllers/PodcastIndexController')(databaseConnection, firebaseBucket);
    const episodeController = require('../controllers/PodcastEpisodesController')(databaseConnection, firebaseBucket);

    /**
     * 
     * GET SignedURL for uploading podcast image on cloud storage. Pass the following 
     * params in query:
     * 
     * podcast_title
     * image_type
     * 
     */
    router.get('/image/upload', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const imageType = req.query.image_type;

        try {
            const url = await indexController.getImageUploadSignedURL(podcastTitle, imageType);
            res.send({
                Message: 'DONE',
                Response: 'SignedURL Generated Successfully!',
                PodcastImageUploadURL: url
            });
        } catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
            });
        }
    });

    /**
     * 
     * POST Podcast Index in the podcast index table in the database. Pass the following 
     * key/values in the JSON body:
     * 
     * podcast_title
     * podcast_host
     * podcast_description
     * image_type
     * 
     */
    router.post('/create', async (req, res) => {
        const podcastTitle = req.body.podcast_title;
        const podcastHost = req.body.podcast_host;
        const podcastDescription = req.body.podcast_description;
        const imageType = req.body.image_type;

        try {
            const response = await indexController.createNewPodcastRecord(podcastTitle, podcastDescription, podcastHost, imageType);
            res.send({
                Message: 'DONE',
                Response: 'Podcast Uploaded Successfully',
                PodcastPubSubAckId: response
            });
        } catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
            });
        }
    });

    /**
     * 
     * GET all the podcast indices in the database
     * 
     */
    router.get('/list', async (req, res) => {
        try {
            const response = await indexController.getPodcasts();
            res.send({
                Message: 'DONE',
                Response: 'Podcast Fetched Successfully',
                Podcast: response
            });
        } catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
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
    router.delete('/delete', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        
        try {
            const response = await indexController.deletePodcastIndexRecordandImage(podcastTitle);
            res.send({
                Message: 'DONE',
                Response: 'Podcast Deleted Successfully',
                PodcastTite: response
            });
        } catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
            });
        }
    })
    
    /**
     * 
     * GET SignedURL for uploading video. Pass following params in query:
     * 
     * podcast_title
     * episode_number
     * episode_title
     * 
     */
    router.get('/episode/video/upload/signedURL', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const episodeNumber = req.query.episode_number;
        const episodeTitle = req.query.episode_title;

        try {
            const url = await episodeController.getEpisodeUploadSignedURL(podcastTitle, episodeNumber, episodeTitle);
            res.send({
                Message: 'DONE',
                Response: 'SignedURL Generated Successfully!',
                EpisodeImageUploadURL: url
            });
        } catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
            });
        }
    });

    /**
     * 
     * POST Podcast Episode in the Database. Pass the following key/values in JSON body:
     * 
     * podcast_title
     * episode_title
     * episode_number
     * episode_description
     * 
     */
    router.post('/episode/create', async (req, res) => {
        const podcastTitle = req.body.podcast_title;
        const episodeTitle = req.body.episode_title;
        const episodeNumber = req.body.episode_number;
        const episodeDescription = req.body.episode_description;

        try {
            const pubSubAck = await episodeController.uploadNewEpisode(podcastTitle, episodeTitle,
                                                                      episodeNumber, episodeDescription);
            
            res.send({
                Message: 'DONE',
                Response: 'Episode Uploaded Successfully!',
                EpisodePubSubAckId: pubSubAck
            });
        }
        catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
            });
        }
    });

    /**
     * 
     * DEL Podcast Episode. Pass the following params in query:
     * 
     * podast_title
     * episode_title
     * episode_number
     * 
     */
    router.delete('/episode/delete', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const episodeTitle = req.query.episode_title;
        const episodeNumber = req.query.episode_number;

        try {
            const response = await episodeController.deleteEpisode(podcastTitle, episodeNumber, episodeTitle);
            res.send({
                Message: 'DONE',
                Response: 'Episode Deleted Successfully',
                EpisodeTite: response
            });
        }
        catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
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
            const response = await episodeController.getEpisodesOfPodcast(podcastTitle);
            res.send({
                Message: 'DONE',
                Response: 'Episode Fetched Successfully',
                Episodes: response
            });
        }
        catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
            });
        }
    });

    /**
     * 
     * GET Stats of a Podcast Episode. Pass the following params in query:
     * 
     * podast_title
     * episode_title
     * episode_number
     * 
     */
    router.get('/episode/stats', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const episodeTitle = req.query.episode_title;
        const episodeNumber = req.query.episode_number;

        try {
            const response = await episodeController.getStatsOfEpisode(podcastTitle, episodeNumber, episodeTitle);
            res.send({
                Messaeg: 'DONE',
                Response: 'Stats Fetched Successfully!',
                Stats: response
            });
        } catch(err) {
            console.error(chalk.error(`{ERR: ${err}}`));
            res.send({
                ERR: err.message
            });
        }
    })
    return router;
}