'use strict';

import mongoose from 'mongoose';
import moment from 'moment';
import async from 'async';
import crypto from 'crypto';
const User = mongoose.model('User');
import config from '../../../config/config';
import node_mandrill from 'node-mandrill';
const mandrill = node_mandrill(config.mandrill.key);
import log4js from 'log4js';
import sample from "./strategy";
const log = log4js.getLogger('auth-authentication');


function signIn(req, res) {
    log.trace('Enter in Signin');
    try {
        User.findOne({email: req.body.email}, '+providers.sample.password', function (err, user) {
            if (err || !user) {
                log.warn('User not found: %s', JSON.stringify(err));
                return res.status(400).send({message: 'User not found'});
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err || !isMatch) {
                        log.warn('Wrong email and/or password: %s', JSON.stringify(err));
                        return res.status(409).send({
                                message: 'Wrong email and/or password'
                            }
                        );
                    } else {
                        const obj = user.toObject();
                        delete obj.providers.sample.password;
                        res.status(200).send({token: user.createToken(user), user: obj});
                    }
                });
            }
        });

    } catch (e) {
        log.fatal('Something wrong');
        return res.status(406).send({message: 'Something wrong'});
    }
}

function signUp(req, res) {
    log.trace('Enter in Signup');

    try {
        User.findOne({email: req.body.email}, function (err, existingUser) {
            if (err || existingUser) {
                log.warn(JSON.stringify(err || existingUser));
                return res.status(409).send(
                    {
                        message: 'There is already an account with this email'
                    });
            } else {
                let role = req.body.role;
                let user = new User({
                    displayName: req.body.displayName,
                    firstName: req.body.displayName.split(/ (.+)?/)[0] || '',
                    lastName: req.body.displayName.split(/ (.+)?/)[1] || '',
                    email: req.body.email,
                    roles: role,
                    'providers.sample.password': req.body.password,
                    'providers.sample.has': true
                });
                let _username = (user.email) ? user.email.split('@')[ 0 ] : user.firstName.toLocaleLowerCase();
                user.username = _username;
                if (role === 'admin' || role === 'teacher' || role === 'mentor' || role==='company') {
                    user.roles = role;
                    user.active = false;
                    user.save(function (err) {
                        if (err) {
                            log.fatal(JSON.stringify(err));
                            return res.status(500).send({message: 'You can not create the [' + role + '] user, please contact us!'});
                        } else {
                            const obj = user.toObject();
                            delete obj.providers.sample.password;
                            res.status(201).send({token: user.createToken(user), user: obj});
                        }
                    });
                } else {
                    user.save(function (err) {
                        if (err) {
                            log.fatal(JSON.stringify(err));
                            return res.status(500).send({message: 'You can not create the user, please contact us!'});
                        } else {
                            let origin = req.headers.origin;
                            User.sendConfirmAccount(origin, user);
                            const obj = user.toObject();
                            delete obj.providers.sample.password;
                            res.status(201).send({token: user.createToken(user), user: obj});
                        }
                    });
                }
            }
        });
    } catch (e) {
        log.fatal('Something wrong: %s', JSON.stringify(e));
        return res.status(406).send({message: 'Something wrong!'});
    }
}

function unlink(req, res) {
    log.trace('Enter in Unlink');
    let provider = req.params.provider;
    try {
        User.findById(req.user, function (err, user) {
            if (err || !user) {
                log.warn('User not found: %s', JSON.stringify(err));
                return res.status(404).send(
                    {
                        message: 'User not found'
                    });
            } else {
                user.providers[provider] = undefined;
                user.save(function (err) {
                    if (err) {
                        log.fatal(JSON.stringify(err));
                        return res.status(500).send({message: 'Problem in deleting the account'});
                    } else {
                        res.status(204).end();
                    }
                });
            }
        });
    } catch (e) {
        log.fatal('Cast to ObjectId failed: %s', JSON.stringify(e));
        res.status(406).send(
            {
                message: 'Cast to ObjectId failed!'
            });
    }
}

function confirmationAccountResend(req, res) {
    log.trace('Enter in confirmationAccountResend');
    let origin = req.headers.origin;

    User.getByEmail(req.body.email, function (err, user) {
        if(err || !user){
            log.warn('Error or user not found: %s',JSON.stringify(err));
            return res.status(400).send({message: 'User not found or Error', error:JSON.stringify(err)});
        }else{
            if(user.verified){
                log.warn('User is already verified');
                return res.status(409).send({message: 'User is already verified'});
            }else{
                User.sendConfirmAccount(origin, user);
                res.status(201).end();
            }
        }
    });
}

function confirmationAccount(req, res) {
    log.trace('Enter in ConfirmationAccount');

    User.findOneAndUpdate({$and:[{
        _id:req.user,
        verified_token: req.params.token,
        verified_token_expires: {
            $gt: moment()
        }
    }]}, {$set:{verified:true, active:true, verified_token:undefined, verified_token_expires:undefined}}, function(err, user){
        if (err || !user) {
            log.fatal('Invalid token or Not Updated', JSON.stringify(err));
            return res.status(404).send({message: 'Invalid token or Not Updated',error:JSON.stringify(err)});
        }else{
            User.getById(req.user, function (err, u) {
                if(err|| !u){
                    log.warn('User Not Found', JSON.stringify(err));
                    return res.status(400).send({message: 'User Not Found'});
                }else{
                    res.status(200).send(u);
                }
            });
        }
    });
}

export default {
    signIn,
    signUp,
    unlink,
    confirmationAccountResend,
    confirmationAccount

}