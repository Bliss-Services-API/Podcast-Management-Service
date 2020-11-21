'use strict';

/**
 * 
 * Strategy for Handling the Permanent Signup Process for the fresh clients, and return
 * the Permanent Token, which will be used to Access Other Services and the APIs of the
 * Bliss App. It doesn't Authorizes for Admin APIs.
 * 
 */
module.exports = () => {
    
    //Importing Modules
    const Strategy = require('passport-http-bearer');
    const fs = require('fs');
    const path = require('path');
    const chalk = require('../chalk.console');

    //Initializing Variables
    const BearerStrategy = Strategy.Strategy;

     /**
     * 
     * Checks if a req header's Authorization: Bearer <TOKEN> is a Transient Token. If not, it'll
     * return an error message. Otherwise, it'll generate Permanent token and send it back to the
     * client, along with session creation in the database, and authorizing the client for login
     * in the app
     * 
     */
    return new BearerStrategy(async (token, done) => {
        const publicKeyPath = path.join(__dirname, "../private/bliss_jwt_public_key.pem")
        const blissJWTPublicKey = fs.readFileSync(publicKeyPath);
    
        try {
            if(token) {

                console.log(chalk.info(token));

                if(token === process.env.ADMIN_API_KEY)
                    return done(null, 'ADMIN');

                const payload = jwt.verify(token, blissJWTPublicKey, {
                    algorithm: 'ES512',
                    issuer: 'Bliss LLC.'
                });

                if(payload.TOKEN_AUTHORIZATION === 'PERMANENT') return done(null, 'PERMANENT');
                else if(payload.TOKEN_AUTHORIZATION === 'TRANSIENT') return done(null, 'TRANSIENT USER');
                else return done(null, 'UNKNOWN TOKEN TYPE');

            } else {
                console.log(chalk.warning('NO TOKEN FOUND'));
                return done(null, 'NO TOKEN FOUND');
            }
        } catch(err) {
            console.error(chalk.error(err.message));

            if(err.name === 'TokenExpiredError'){
                return done({
                    ERR: 'TokenExpired',
                    CODE: '301'
                });
            }
            else if(err.name === 'JsonWebTokenError'){
                return done({
                    ERR: err.message,
                    CODE: '302'
                });
            }
            else if(err.name === 'NotBeforeError') {
                return done({
                    ERR: 'Token Not Active',
                    CODE: '303'
                });
            }
            else {
                return done(err);
            }
        }
    });
}