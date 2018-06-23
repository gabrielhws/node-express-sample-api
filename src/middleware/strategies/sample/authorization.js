'use strict';

import config from '../../../config/config';
import jwt from 'jwt-simple';
import moment from 'moment';
import mongoose from 'mongoose';
const User = mongoose.model('User');
import log4js from 'log4js';
const log = log4js.getLogger('auth-authorization');

function hasAuthorization(req, res, next) {
    log.trace('Enter in HasAuthorization');
    if (!req.headers.authorization && !req.query.authorization) {
        return res.status(401).send({message: 'Please make sure your request has an Authorization header'});
    }

    try {
        let token = '';
        if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (req.query.authorization) {
            token = req.query.authorization;
        }

        let payload = jwt.decode(token, config.token_secret);
        if (payload.exp <= moment().unix()) {
            log.warn('Token has expired');
            return res.status(401).send({message: 'Token has expired'});
        }
        req.user = payload.sub;
    } catch (e) {
        log.warn('Occur an error while processing the user token');
        return res.status(406).send({message: 'Unacceptable user token'});
    }
    next();
}


function hasTokenHeader(req, res, next) {
    log.trace('Enter in HasTokenHeader');
    const headerSecret = config.header_secret;
    const token = req.headers['x-csh-key'] || req.query['x-sample-key'];

    if (!token) {
        log.warn('Please make sure your request has an Authorization header');
        return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
    }
    if (token !== headerSecret) {
        log.warn('Authorization header has invalid');
        return res.status(401).send({ message: 'Authorization header has invalid' });
    }
    next();
}

function hasUserRole(req, res, next) {
    log.trace('Enter in HasUserRole');
    User.findById(req.user)
        .select('roles')
        .exec(function (err, user) {
            if (err || !user) {
                log.warn('User not found');
                return res.status(400).send(
                    {
                        message: 'User not found'
                    });
            } else {
                if (user.roles.indexOf('admin') === -1) {
                    log.warn('Execute access forbidden');
                    return res.status(403).send(
                        {
                            message: 'Execute access forbidden'
                        });
                } else {
                    next();
                }
            }
        });
}

export default {
    hasAuthorization,
    hasTokenHeader,
    hasUserRole
}