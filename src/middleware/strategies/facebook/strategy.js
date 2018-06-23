'use strict';

import config from '../../../config/config';
import profile from './profile';
import request from 'request';

exports.facebook = function(req, res) {
    if (req.body.access_token) {
        // Step 1. Retrieve profile information about the current user.
        profile.user(req, res, req.body);
    } else {
        const params = {
            code: req.body.code,
            client_id: config.facebook.client_id,
            client_secret: config.facebook.client_secret,
            redirect_uri: req.body.redirectUri
        };

        // Step 1. Exchange authorization code for access token.
        request.get({url: config.facebook.access_token_url, qs: params, json: true},
            function (err, response, headers) {

                if (response.statusCode !== 200) {
                    return res.status(500).send({message: headers.error.message});
                }
                // Step 2. Retrieve profile information about the current user.
                profile.user(req, res, headers);

            });
    }
};
