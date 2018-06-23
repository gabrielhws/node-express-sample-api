'use strict';

import config from '../../../config/config';
import request from 'request';
import jwt from 'jwt-simple';
import mongoose from 'mongoose';
import  log4js from 'log4js';

const User = mongoose.model('User');
const log = log4js.getLogger('google');


const parse = function (json) {
    if ('string' === typeof json) {
        json = JSON.parse(json);
    }

    const profile = {};
    profile.id = json.id;
    profile.displayName = json.name;
    profile.firstName = json.given_name;
    profile.lastName = json.family_name;
    profile.email = json.email;
    profile.image = json.picture;
    return profile;
};

const profile = function (params, done) {
    request.get({
        url: config.google.api_url,
        headers: params,
        json: true
    }, function (err, res, json) {
        if (res.statusCode !== 200) {
            return done(true, json.error.message);
        }

        const profile = parse(json);
        profile._json = json;
        done(false, profile);
    });
};

exports.user = function (req, res, headers) {
    profile(headers, function (err, data) {
        // Step 1. Retrieve profile information about the current user.
        if (err) {
            return res.status(500).send({message: data});
        } else {
            if (req.headers.authorization) {
                // Step 2a. Link user accounts.
                User.findOne({'providers.google.id': data.id}, function (err, existingUser) {
                    if (err || existingUser) {
                        log.debug(err);
                        return res.status(409).send({ message: 'There is already a Google account that belongs to you'});
                    }
                    let token = req.headers.authorization.split(' ')[1];
                    let payload = jwt.decode(token, config.token_secret);
                    try {
                        User.findById(payload.sub, function (err, user) {
                            if (!user) {
                                return res.status(404).send( { message: 'User not found'});
                            }

                            user.displayName = user.displayName || data.displayName;
                            user.image = user.image || data.image;
                            user.email = user.email || data.email;
                            user.providers.google = data;
                            user.active = user.active || true;
                            user.verified = user.verified || true;
                            user.save(function (err) {
                                if (err) {
                                    log.fatal(err);
                                    return res.status(500).send({message: 'Has not been possible to update the user, please contact us!'});
                                }
                                res.send({token: user.createToken(user), user: user});
                            });
                        });
                    } catch (e) {
                        return res.status(406).send({message: 'Something wrong!'});
                    }
                });
            } else {
                // Step 2b. Merge a user account or return an existing one.
                User.findOne({'providers.google.id': data.id}, function (err, existingUser) {
                    if (existingUser) {
                        return res.send({token: existingUser.createToken(existingUser), user: existingUser});
                    }
                    User.findOne({email: data.email}, function (err, existingUser) {
                        // Step 3a. Merge the user account
                        if (existingUser) {

                            existingUser.firstName = existingUser.firstName || data.firstName;
                            existingUser.lastName = existingUser.lastName || data.lastName;
                            existingUser.displayName = existingUser.displayName || data.displayName;
                            existingUser.image = existingUser.image || data.image;
                            existingUser.providers.google = data;
                            existingUser.active = existingUser.active || true;
                            existingUser.verified = existingUser.verified || true;
                            existingUser.save(function (err) {
                                if (err) {
                                    log.fatal(err);
                                    return res.status(500).send({ message: 'Has not been possible to update the user, please contact us!'});
                                }
                                return res.send({
                                    token: existingUser.createToken(existingUser),
                                    user: existingUser
                                });
                            });
                        } else {
                            // Step 3b. Create a new one.// Step 3b. Create a new one.
                            let username = (data.email) ? data.email.split('@')[0] : data.firstName.toLocaleLowerCase();
                            User.findUniqueUsername(username, null, function (username) {
                                const user = new User();
                                user.firstName = data.firstName;
                                user.lastName = data.lastName;
                                user.username = username;
                                user.displayName = data.displayName;
                                user.email = data.email;
                                user.image = data.image;
                                user.providers.google = data;
                                user.verified = true;
                                user.save(function (err) {
                                    if (err) {
                                        log.fatal(err);
                                        return res.status(500).send({ message: 'Has not been possible to create the user, please contact us!'});
                                    }
                                    return res.send({token: user.createToken(user), user: user});
                                });
                            });
                        }
                    });
                });
            }
        }
    });
};