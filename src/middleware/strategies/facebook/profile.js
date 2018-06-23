'use strict';

import config from "../../../config/config";
import jwt from "jwt-simple";
import request from "request";
import mongoose from "mongoose";
import log4js from "log4js";
const User = mongoose.model('User');
const log = log4js.getLogger('facebook');

const parse = function (json) {
    if ('string' === typeof json) {
        json = JSON.parse(json);
    }
    const profile = {};
    profile.id = json.id;
    profile.displayName = json.name;
    profile.firstName = json.first_name;
    profile.lastName = json.last_name;
    if (json.gender) {
        profile.gender = json.gender;
    }
    profile.verified = false;
    if (json.email) {
        profile.email = json.email;
        profile.verified = true;
    }

    profile.image = 'https://graph.facebook.com/' + profile.id + '/picture?type=large&w‌​idth=250&height=250';

    return profile;
};

const profile = function (params, done) {
    request.get({
        url: config.facebook.api_url,
        qs: params,
        json: true
    }, function (err, res, json) {
        if (res.statusCode !== 200) {
            return done(true, json.error.message);
        }
        let profile = parse(json);
        profile._json = json;
        done(false, profile);
    });
};

exports.user = function (req, res, headers) {
    // Step 1. Retrieve profile information about the current user.
    profile(headers, function (err, data) {
        if (err) {
            log.fatal(data);
            return res.status(500).send({message: data});
        } else {
            // Step 2a. Link user accounts.
            if (req.headers.authorization) {
                User.findOne({'providers.facebook.id': data.id}, function (err, existingUser) {
                    if (existingUser) {
                        return res.status(409).send({message: 'There is already a Facebook account that belongs to you'});
                    } else {
                        let token = req.headers.authorization.split(' ')[ 1 ];
                        let payload = jwt.decode(token, config.token_secret);
                        try {
                            User.findById(payload.sub, function (err, user) {
                                if (!user) {
                                    return res.status(404).send({message: 'User not found'});
                                }


                                user.displayName = user.displayName || data.displayName;
                                user.image = user.image || data.image;
                                user.email = user.email || data.email;
                                user.gender = user.gender || data.gender;
                                user.providers.facebook = data;
                                user.active = user.active || true;
                                user.verified = user.verified || data.verified;

                                user.save(function (err) {
                                    if (err) {
                                        log.fatal(err);
                                        return res.status(500).send({message: 'Has not been possible to update the user, please contact us!'});
                                    }
                                    res.send({token: user.createToken(user), user: user});
                                });
                            });
                        } catch (e) {
                            res.status(406).send({message: 'Something wrong!'});
                        }
                    }
                });
            } else {
                // Step 2b. Merge a user account or return an existing one.
                User.findOne({'providers.facebook.id': data.id}, function (err, existingUser) {
                    if (existingUser) {
                        return res.send({
                            token: existingUser.createToken(existingUser),
                            user: existingUser
                        });
                    }
                    User.findOne({email: data.email}, function (err, existingUser) {
                        // Step 3a. Merge the user account
                        if (existingUser) {

                            existingUser.firstName = existingUser.firstName || data.firstName;
                            existingUser.lastName = existingUser.lastName || data.lastName;
                            existingUser.displayName = existingUser.displayName || data.displayName;
                            existingUser.image = existingUser.image || data.image;
                            existingUser.gender = existingUser.gender || data.gender;
                            existingUser.providers.facebook = data;
                            existingUser.active = existingUser.active || true;
                            existingUser.verified = existingUser.verified || data.verified;
                            existingUser.user_agent = req.useragent;

                            existingUser.save(function (err) {
                                if (err) {
                                    log.fatal(err);
                                    return res.status(500).send({message: 'Has not been possible to update the user, please contact us!'});
                                }
                                return res.send({
                                    token: existingUser.createToken(existingUser),
                                    user: existingUser
                                });
                            });
                        } else {
                            // Step 3b. Create a new one.

                            let username = (data.email) ? data.email.split('@')[ 0 ] : data.firstName.toLocaleLowerCase();
                            User.findUniqueUsername(username, null, function (username) {
                                const user = new User();


                                user.firstName = data.firstName;
                                user.lastName = data.lastName;
                                user.username = username;
                                user.displayName = data.displayName;
                                user.email = data.email;
                                user.gender = data.gender;
                                user.image = data.image;
                                user.providers.facebook = data;
                                user.verified = data.verified;

                                user.save(function (err) {
                                    if (err) {
                                        log.fatal(err);
                                        return res.status(500).send({message: 'Has not been possible to create the user, please contact us!'});
                                    }
                                    res.send({token: user.createToken(user), user: user});
                                });
                            });
                        }
                    });
                });
            }
        }
    });
};