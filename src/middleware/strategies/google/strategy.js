'use strict';

import config from '../../../config/config';
import profile from './profile';
import request from 'request';

exports.google = function (req, res) {
    const params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: config.google.client_secret,
        redirect_uri: req.body.redirectUri,
        grant_type: 'authorization_code'
    };

    // Step 1. Exchange authorization code for access token.
    request.post(config.google.access_token_url,
        {json: true, form: params},
        function (err, response, token) {
            let accessToken = token.access_token;
            let headers = {Authorization: 'Bearer ' + accessToken};
            profile.user(req, res, headers);
        });
};

exports.google_mobile = function (req, res) {
    let accessToken = req.body.access_token;
    let headers = {Authorization: 'Bearer ' + accessToken};
    profile.user(req, res, headers);
};