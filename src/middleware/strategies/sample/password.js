'use strict';

import config from "../../../config/config";
import async from "async";
import crypto from "crypto";
import User from "../../../models/user";
import node_mandrill from "node-mandrill";
import log4js from "log4js";
import sample from "./strategy";

const mandrill = node_mandrill(config.mandrill.key);
const log = log4js.getLogger('auth-password');

function forgot(req, res) {
    log.trace('Enter in Forgot');

    User.getByEmail(req.body.email, function (err, user) {
        if (err) {
            log.fatal('Error in search user: %s', JSON.stringify(err));
            return res.status(400).send({message: 'Error in search user', error: JSON.stringify(err)});
        }

        if (!user) {
            log.warn('No account with that email has been found');
            return res.status(404).send({message: 'No account with that email has been found'});
        } else {
            if (!user.providers.sample.has) {
                log.warn('It seems like you signed up using your social account');
                return res.status(400).send({
                    message: 'It seems like you signed up using your social account'
                });
            } else {
                crypto.randomBytes(20, function (err, buffer) {
                    if (err) {
                        log.fatal('Error in generate token: %s', JSON.stringify(err));
                        return res.status(500).send({message: 'Generate token fail', error: JSON.stringify(err)});
                    }
                    else {
                        let token = buffer.toString('hex');
                        user.providers.sample.resetPasswordToken = token;
                        user.providers.sample.resetPasswordExpires = Date.now() + 3600000;
                        user.isModified();
                        user.save(function (err) {
                            if (err) {
                                log.fatal('Failed to create the token from reset: %s', JSON.stringify(err));
                                return res.status(500).send({
                                    message: 'Failed to create the token from reset'
                                });
                            } else {
                                User.sendResetPasswordEmail(req.headers.origin, token, user);
                                res.status(201).send({
                                    message: 'An email has been sent to ' + user.email + ' with further instructions'
                                });
                            }
                        });
                    }
                });
            }
        }
    });
}

function validateResetToken(req, res) {
    log.trace('Enter in ValidateResetToken');
    User.findOne({$and:[{
        'providers.sample.resetPasswordToken': req.params.token,
        'providers.sample.resetPasswordExpires': {
            $gt: Date.now()}
    }]}, function (err, user) {
        if (!user) {
            log.fatal('Invalid token');
            return res.status(401).send(
                {
                    message: 'Invalid token'
                    //message:'Token inválido'
                });
        } else {
            res.status(204).end();
        }
    });
}

function reset(req, res) {
    log.trace('Enter in Reset');
    async.waterfall([
        function (next) {
            User.findOne({
                'providers.sample.resetPasswordToken': req.params.token,
                'providers.sample.resetPasswordExpires': {
                    $gt: Date.now()
                }
            }, function (err, user) {
                if (!err && user) {
                    if (req.body.newPassword === req.body.confirmPassword) {
                        user.providers.sample.password = req.body.newPassword;
                        user.providers.sample.resetPasswordToken = undefined;
                        user.providers.sample.resetPasswordExpires = undefined;

                        user.save(function (err) {
                            if (err) {
                                log.fatal('Password reset failed: %s', JSON.stringify(err));
                                return res.status(500).send(
                                    {
                                        message: 'Password reset failed'
                                        //message:'Redefinição de senha falhou'
                                    });
                            }
                            const obj = user.toObject();
                            delete obj.providers.sample.password;
                            next(err, obj);
                        });
                    } else {
                        log.warn('Passwords do not match');
                        return res.status(409).send({
                            message: 'Passwords do not match'
                            //message:'As senhas não coincidem'
                        });
                    }
                } else {
                    log.warn('Password reset token is invalid or has expired.');
                    return res.status(400).send({
                        message: 'Password reset token is invalid or has expired.'
                        //message:'Token de redefinição de senha é inválido ou expirou.'
                    });
                }
            });
        },
        function (user, next) {
            res.render('auth/reset-password-confirm-email', {
                contact:config.email,
                displayName: user.displayName,
                appName: config.title
            }, function (err, emailHTML) {
                if (err) {
                    log.fatal('Failed to create the email of reset password', JSON.stringify(err));
                    return res.status(500).send({
                        message: 'Failed to create the email of reset password'
                        //message:'Falha ao criar o e-mail de redefinição de senha'
                    });
                } else {
                    next(err, emailHTML, user);
                }
            });
        },
        // If valid email, send reset email using service
        function (emailHTML, user) {
            mandrill('/messages/send', {
                message: {
                    to: [ {email: user.email, name: user.displayName} ],
                    from_email: config.mandrill.from,
                    from_name: config.mandrill.from_name,
                    subject: 'Sua senha foi alterada',
                    html: emailHTML
                }
            }, function (err, response) {
                return (err || response.status === 'rejected') ?
                    res.status(500).send({
                        message: 'Failed to sent the email, please contact the administrator'
                        //message: 'Falha ao enviado o e-mail, por favor, entre em contato com o administrador'
                    }) :
                    res.status(200).send({user: user});
            });
        }
    ]);
}


function setPassword(req, res) {
    log.trace('Enter in SetPassword');
    User.findById(req.user, function (err, user) {
        if (!user) {
            log.warn('User not found');
            return res.status(400).send({ message: 'User not found' });
        } else {
            user.providers.sample.password = req.body.password;
            user.providers.sample.has = true;
            user.save(function (err) {
                if (err) {
                    log.fatal('Password set failed: %s', JSON.stringify(err));
                    res.status(500).send({ message: 'Password set failed'});
                } else {
                    res.status(201).send({message: 'Password has been set!'});
                }
            });
        }
    });
}

function changePassword(req, res) {
    log.trace('Enter in ChangePassword');

    User.findById(req.user, '+providers.sample.password', function (err, user) {
        if (!user) {
            log.warn('User not found');
            return res.status(400).send({ message: 'User not found' });
        } else {
            user.comparePassword(req.body.currentPassword, function (err, isMatch) {
                if (!isMatch) {
                    log.warn('Current password is incorrect');
                    return res.status(409).send( { message: 'Current password is incorrect' });
                } else {
                    user.providers.sample.password = req.body.newPassword;
                    user.save(function (err) {
                        if (err) {
                            log.fatal('Password changed fail: %s', JSON.stringify(err));
                            res.status(500).send({ message: 'Password changed fail' });
                        } else {
                            res.status(201).send({message: 'Password has been changed!'});
                        }
                    });
                }
            });
        }
    });
}

export default {
    forgot,
    validateResetToken,
    reset,
    setPassword,
    changePassword

}