'use strict';

const router = require('express').Router();

module.exports = (pgConnection, firebaseBucket) => {
    const IndexController = require('../controllers/PodcastIndexController')(pgConnection, firebaseBucket);
    const EpisodeController = require('../controllers/PodcastEpisodesController')(pgConnection, firebaseBucket);

    /**
     * 
     * Podcasts Routes
     * 
     */

    //Get SignedURL for Image Upload of New Podcast
    router.get('/p/image/upload', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const imageType = req.query.image_type;

        const response = await IndexController.getImageUploadSignedURL(podcastTitle, imageType);
        res.send({
            response: response
        });
    });

    //Record New Podcast
    router.post('/p/create', async (req, res) => {
        if(req.query.response === 'OK'){
            const podcastTitle = req.body.podcast_title;
            const podcastHost = req.body.podcast_host;
            const podcastDescription = req.body.podcast_description;
            const imageType = req.body.image_type;

            const response = await IndexController.createNewPodcastRecord(podcastTitle, podcastDescription, podcastHost, imageType);
            res.send({ 
                response: response 
            });
        } else if(req.query.response === 'DELETE') {
            const podcastTitle = req.body.podcast_title;
            
            const response = await IndexController.deletePodcastIndexRecordandImage(podcastTitle);
            res.send({ 
                response: response 
            });
        } else {
            res.status(401).send("Wrong Query");
        }
    });

    //List All Podcasts
    router.get('/p/list', async (req, res) => {
        const response = await IndexController.getPodcasts();
        res.send({ response: response });
    });

    //Delete A Podcast
    router.delete('/p/delete', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        
        const response = await IndexController.deletePodcastIndexRecordandImage(podcastTitle);
        res.send({ response: response })  
    })
    

    /**
     * 
     * Episodes Routes
     * 
     */

     //Generate Cloud Storage SignedURL for Uploading Episode Video
    router.get('/e/video/upload/', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const episodeNumber = req.query.episode_number;
        const videoFileName = req.query.video_name;
        const videoType = req.query.video_type;

        const response = await EpisodeController.getEpisodeUploadSignedURL(podcastTitle, episodeNumber, videoFileName, videoType);
        res.send({ response: response });
    });

    //Record New Episode
    router.post('/e/create', async (req, res) => {
        const podcastTitle = req.body.podcast_title;
        const episodeTitle = req.body.episode_title;
        const episodeNumber = req.body.episode_number;
        const episodeDescription = req.body.episode_description;
        const videoFileName = req.body.video_name;
        const videoType = req.body.video_type;

        const response = await EpisodeController.uploadNewEpisode(podcastTitle, episodeTitle,
                                                                  episodeNumber, episodeDescription,
                                                                  videoFileName, videoType);
        res.send({ response: response });
    });

    //Delete Episode
    router.delete('/e/delete', async (req, res) => {
        const podcastTitle = req.query.podcast_title;
        const episodeTitle = req.query.episode_title;
        const episodeNumber = req.query.episode_number;
        const videoFileName = req.query.video_name;
        const videoType = req.query.video_type;

        const response = await EpisodeController.deleteEpisode(podcastTitle, episodeNumber, 
                                                         episodeTitle, videoFileName, videoType);
        res.send({ response: response });
    });

    //List Episodes of A Podcast
    router.get('/e/list', async (req, res) => {
        const podcastTitle = req.query.podcast_title;

        const response = await EpisodeController.getEpisodesOfPodcast(podcastTitle);
        res.send({ response: response });
    });

    return router;
}