'use strict';
import mongoose from "mongoose";
import log4js from "log4js";
import cloudinary from "../middleware/cloudinary";
import formidable from "formidable";
import _ from "lodash";
import moipSdk from "../middleware/sdk/moip";
import moment from 'moment';
const User = mongoose.model('User');
import cep from 'cep-promise'

const log = log4js.getLogger('user');


function me(req, res) {
    log.trace('Enter in Me');
    User.findById(req.user)
        .populate('wish_list', '_id name slug image')
        .exec(function (err, user) {
            if (err || !user) {
                log.warn('User not found');
                return res.status(404).send({message: 'User not found'});
            } else {
                log.debug('User found');
                const obj = user.toObject();
                delete obj.providers.sample.password;
                res.status(200).send({user: obj});
            }
        });
}

function updateProfile(req, res) {
    log.trace('Enter in Update Profile');

    let user = req.body;
    delete user.providers;

    User.update({_id: req.user}, user)
        .exec(function (err, u) {
            if (err || !u) {
                log.warn('The user has not been updated');
                return res.status(500).send({message: 'The user has not been updated'});
            } else {
                log.debug('The user has been updated');
                User.findById(req.user)
                    .exec(function (err, userAction) {
                        if (err || !userAction) {
                            log.warn('User not found');
                            return res.status(404).send({message: 'User not found'});
                        } else {
                            userAction.update_date = moment();
                            userAction.save();
                            const obj = userAction.toObject();
                            delete obj.providers.sample.password;
                            res.status(200).send({user: obj});
                        }
                    });
            }
        });
}

function deleteProfile(req, res) {
    log.trace('Enter in Delete Profile');
    try {
        if (ObjectId.isValid(req.user)) {
            User.findByIdAndRemove(req.user)
                .exec(function (err, user) {
                    if (err) {
                        log.warn('The user has not been updated');
                        return res.status(500).send({message: 'The user has not been updated'});
                    } else {
                        log.debug('User was removed');
                        res.status(204).end();
                    }
                });
        } else {
            log.warn('Unacceptable request');
            return res.status(406).send({message: 'Unacceptable request'});
        }
    } catch (e) {
        log.fatal('Something is wrong');
        return res.status(406).send({message: 'Something wrong!'});
    }
}

function disableProfile(req, res) {
    log.trace('Enter in Disable Profile');
    try {
        if (ObjectId.isValid(req.user)) {
            User.findByIdAndUpdate(req.user,
                {
                    active: false,
                    verified: false
                })
                .exec(function (err, user) {
                    if (err || !user) {
                        log.warn('User not found');
                        return res.status(404).send({message: 'User not found'});
                    } else {
                        log.debug('User updated to inactive');
                        res.status(204).end();
                    }
                });
        } else {
            log.warn('Unacceptable request');
            return res.status(406).send({message: 'Unacceptable request'});
        }

    } catch (e) {
        log.fatal('Something is wrong');
        return res.status(406).send({message: 'Something wrong!'});
    }
}

function activeMoip (req, res) {
    log.trace('Enter in active Moip');
    const userId = req.user;

    if (ObjectId.isValid(userId)) {
        User.findById(userId)
            .then((user) => {
                moipSdk.createAccount(user)
                    .then((data) => {
                        user.moip.merchant_id = data.id;
                        user.moip.original_merchant = data;
                        user.save();
                        return res.status(200).send({message: 'The user has been create on Moip'});
                    })
                    .catch((err) => {
                        log.fatal('Error on Moip SDK: %s', JSON.stringify(err));
                        return res.status(500).send({
                            message: 'Error on Moip SDK.',
                            error: JSON.stringify(err)
                        });
                    });
            })
            .catch((err) => {
                log.fatal('Error while find the user: %s', JSON.stringify(err));
                return res.status(500).send({message: 'Could no be find the user: ' + userId});
            });
    } else {
        log.warn('Unacceptable request');
        return res.status(406).send({message: 'Unacceptable request'});
    }
}

function updateAvatar(req, res) {
    log.trace('Enter in Update Avatar');

    const form = new formidable.IncomingForm();



    const whitelistExt = [
        'image/jpeg',
        'image/gif',
        'image/png'
    ];

    const whitelistRes = [
        'users',
        'cover-image',
        'guide'
    ];

    form.once('error', (err) => {
        log.fatal('Error on FormOnce: %s', JSON.stringify(err));
        return res.status(500).send({

            message: err
        });
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            log.fatal('Error Fatal on Form Parse: %s', JSON.stringify(err));
            return res.status(500).send({
                message: err
            });
        }
        if (!files.media || !fields.path) {
            log.warn('Please provide params path, media');
            return res.status(400).send({
                message: 'Please provide params path, media'
            });
        }

        const fieldName = files.media.name.replace(/\s/g, '_').replace(/[^\x00-\x7F]/g, '');
        const fieldPath = files.media.path;
        const relativePath = fields.path.replace('../', '').replace(/^\//, '');

        const validEx = whitelistExt.find(function (v, i) {
            return v === files.media.type;
        });

        if (_.isNil(validEx) || !validEx.length) {
            log.warn('Not supported media type');
            return res.status(400).send({
                message: 'Not supported media type'
            });
        }

        const validRt = whitelistRes.find(function (v, i) {
            return v === relativePath.split('/').shift();
        });

        if (_.isNil(validRt) || !validRt.length) {
            log.warn('Not supported root path');
            return res.status(400).send({
                message: 'Not supported root path'
            });
        }

        User.getById(req.user, function (err, user) {
            if (err || !user) {
                log.warn('User not found');
                return res.status(404).send({message: 'User not found'});
            } else {
                const folder = 'sample/avatar/'+user._id;
                let _lastImage = _.get(user, 'image_public_id', false);

                cloudinary.send(fieldPath, whitelistRes, folder, function (err, result) {
                    if (err) {
                        log.fatal('Error on Cloudinary SDK', JSON.stringify(err));
                        return res.status(404).send({message: 'Error in Cloudinary SDK', error: JSON.stringify(err)});
                    } else {
                        log.debug(result);
                        if (_lastImage) {
                            cloudinary.remove(_lastImage, {}, function (err, r) {
                                if (err) {
                                    log.fatal('Error on remove avatar image sdk', JSON.stringify(err));
                                    return res.status(500).send({message:'Error on remove avatar image sdk', error:JSON.stringify(err)});
                                } else {
                                    log.info('Cloudinary Avatar Image Deleted: %s', JSON.stringify(r));
                                    user.image = result.url;
                                    user.image_public_id = result.public_id;
                                    user.isModified();
                                    user.save(function (err) {
                                        if (err) {
                                            log.warn('The user has not been updated', JSON.stringify(err));
                                            return res.status(500).send({message: 'The user has not been updated'});
                                        } else {
                                            log.debug('The user has been updated');
                                            User.findById(req.user)
                                                .exec(function (err, userAction) {
                                                    if (err || !userAction) {
                                                        log.warn('User not found');
                                                        return res.status(404).send({message: 'User not found'});
                                                    } else {
                                                        const obj = userAction.toObject();
                                                        delete obj.providers.sample.password;
                                                        res.status(200).send({user: obj});
                                                    }
                                                });
                                        }
                                    });
                                }
                            });
                        } else {
                            user.image = result.url;
                            user.image_public_id = result.public_id;
                            user.isModified();
                            user.save(function (err) {
                                if (err) {
                                    log.warn('The user has not been updated', JSON.stringify(err));
                                    return res.status(500).send({message: 'The user has not been updated'});
                                } else {
                                    log.debug('The user has been updated');
                                    User.findById(req.user)
                                        .exec(function (err, userAction) {
                                            if (err || !userAction) {
                                                log.warn('User not found');
                                                return res.status(404).send({message: 'User not found'});
                                            } else {
                                                const obj = userAction.toObject();
                                                delete obj.providers.sample.password;
                                                res.status(200).send({user: obj});
                                            }
                                        });
                                }
                            });
                        }
                    }
                });
            }
        });
    });
}


function getProfile(req, res) {
    log.trace('Enter in GetProfile');

    User.getByUsername(req.params.username, function (err, profile) {
        if (err || !profile) {
            log.warn('Profile not found');
            return res.status(404).send({message: 'Profile not found'});
        } else {
            profile.statistics.visits.total += 1;
            profile.isModified();
            profile.save();
            res.status(200).send(profile);
        }
    });

}

function updateCoverImage(req, res) {
    log.trace('Enter in updateCoverImage');
    const form = new formidable.IncomingForm();

    const whitelistExt = [
        'image/jpeg',
        'image/gif',
        'image/png'
    ];

    const whitelistRes = [
        'users',
        'cover-image',
        'guide'
    ];

    form.once('error', (err) => {
        return res.status(500).send({
            message: err
        });
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(500).send({
                message: err
            });
        }
        if (!files.media || !fields.path) {
            return res.status(400).send({
                message: 'Please provide params path, media'
            });
        }
        // http://stackoverflow.com/a/20856346
        const fieldName = files.media.name.replace(/\s/g, '_').replace(/[^\x00-\x7F]/g, '');
        const fieldPath = files.media.path;
        const relativePath = fields.path.replace('../', '').replace(/^\//, '');

        const validEx = whitelistExt.find(function (v, i) {
            return v === files.media.type;
        });
        if (_.isNil(validEx) || !validEx.length) {
            return res.status(400).send({
                message: 'Not supported media type'
            });
        }

        const validRt = whitelistRes.find(function (v, i) {
            return v === relativePath.split('/').shift();
        });
        if (_.isNil(validRt) || !validRt.length) {
            return res.status(400).send({
                message: 'Not supported root path'
            });
        }


        User.getById(req.user, function (err, user) {
            if (err || !user) {
                log.warn('User not found');
                return res.status(404).send({message: 'User not found'});
            } else {
                const folder = 'sample/profile/cover/'+user._id;
                let _lastImage = _.get(user.cover_image, 'public_id', false);

                cloudinary.send(fieldPath, whitelistRes, folder, function (err, result) {
                    if (err) {
                        log.fatal('Error in Cloudinary SDK', JSON.stringify(err));
                        return res.status(404).send({message: 'Error in Cloudinary SDK', error: JSON.stringify(err)});
                    } else {
                        log.debug(result);
                        if (_lastImage) {
                            cloudinary.remove(_lastImage, {}, function (err, r) {
                                if (err) {
                                    log.fatal('Error in remove cover image sdk', JSON.stringify(err));
                                } else {
                                    log.info('Cloudinary Cover Image Deleted: %s', JSON.stringify(r));
                                    user.cover_image = result;
                                    user.isModified();
                                    user.save(function (err) {
                                        if (err) {
                                            log.warn('The user has not been updated', JSON.stringify(err));
                                            return res.status(500).send({message: 'The user has not been updated'});
                                        } else {
                                            log.debug('The user has been updated');
                                            User.findById(req.user)
                                                .exec(function (err, userAction) {
                                                    if (err || !userAction) {
                                                        log.warn('User not found');
                                                        return res.status(404).send({message: 'User not found'});
                                                    } else {
                                                        const obj = userAction.toObject();
                                                        delete obj.providers.sample.password;
                                                        res.status(200).send({user: obj});
                                                    }
                                                });
                                        }
                                    });
                                }
                            });
                        } else {
                            user.cover_image = result;
                            user.isModified();
                            user.save(function (err) {
                                if (err) {
                                    log.warn('The user has not been updated', JSON.stringify(err));
                                    return res.status(500).send({message: 'The user has not been updated'});
                                } else {
                                    log.debug('The user has been updated');
                                    User.findById(req.user)
                                        .exec(function (err, userAction) {
                                            if (err || !userAction) {
                                                log.warn('User not found');
                                                return res.status(404).send({message: 'User not found'});
                                            } else {
                                                const obj = userAction.toObject();
                                                delete obj.providers.sample.password;
                                                res.status(200).send({user: obj});
                                            }
                                        });
                                }
                            });
                        }
                    }
                });
            }
        });
    });
}

function deleteCloudinaryCoverImage(req, res) {
    log.trace('Enter in Delete Cloudinary Image');

    User.getById(req.user, function (err, user) {
        if (err || !user) {
            log.warn('User not found');
            return res.status(404).send({message: 'User not found'});
        } else {
            cloudinary.remove(user.cover_image.public_id, {}, function (err, r) {
                if (err || !r) {
                    log.fatal('Error in remove cover image sdk', JSON.stringify(err));
                    return res.status(400).send({
                        message: 'Error in remove cover image sdk',
                        error: JSON.stringify(err)
                    });
                } else {
                    log.info('Cloudinary Cover Image Deleted: %s', JSON.stringify(r));
                    user.cover_image = {};
                    user.isModified();
                    user.save(function (err) {
                        if (err) {
                            log.warn('The user has not been updated', JSON.stringify(err));
                            return res.status(500).send({message: 'The user has not been updated'});
                        } else {
                            log.debug('The user has been updated');
                            User.findById(req.user)
                                .exec(function (err, userAction) {
                                    if (err || !userAction) {
                                        log.warn('User not found');
                                        return res.status(404).send({message: 'User not found'});
                                    } else {
                                        const obj = userAction.toObject();
                                        delete obj.providers.sample.password;
                                        res.status(200).send({user: obj});
                                    }
                                });
                        }
                    });
                }
            });
        }
    });
}

function insertImageOnGallery(req, res) {
    log.trace('Enter in InsertImageOnGallery');

    const form = new formidable.IncomingForm();

    const whitelistExt = [
        'image/jpeg',
        'image/gif',
        'image/png'
    ];

    const whitelistRes = [
        'users',
        'album',
        'guide'
    ];

    form.once('error', (err) => {
        return res.status(500).send({
            message: err
        });
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(500).send({
                message: err
            });
        }
        if (!files.media || !fields.path) {
            return res.status(400).send({
                message: 'Please provide params path, media'
            });
        }
        // http://stackoverflow.com/a/20856346
        const fieldName = files.media.name.replace(/\s/g, '_').replace(/[^\x00-\x7F]/g, '');
        const fieldPath = files.media.path;
        const relativePath = fields.path.replace('../', '').replace(/^\//, '');

        const validEx = whitelistExt.find(function (v, i) {
            return v === files.media.type;
        });
        if (_.isNil(validEx) || !validEx.length) {
            return res.status(400).send({
                message: 'Not supported media type'
            });
        }

        const validRt = whitelistRes.find(function (v, i) {
            return v === relativePath.split('/').shift();
        });
        if (_.isNil(validRt) || !validRt.length) {
            return res.status(400).send({
                message: 'Not supported root path'
            });
        }

        User.getById(req.user, function (err, user) {
            if (err || !user) {
                log.warn('User not found');
                return res.status(404).send({message: 'User not found'});
            } else {
                const folder = 'sample/profile/gallery/'+user._id;

                cloudinary.send(fieldPath, whitelistRes, folder, function (err, result) {
                    if (err) {
                        log.fatal('Error in Cloudinary SDK', JSON.stringify(err));
                        return res.status(404).send({message: 'Error in Cloudinary SDK', error: JSON.stringify(err)});
                    } else {
                        log.debug(result);
                        user.gallery.push(result);
                        user.isModified();
                        user.save(function (err) {
                            if (err) {
                                log.warn('The user has not been updated', JSON.stringify(err));
                                return res.status(500).send({message: 'The user has not been updated'});
                            } else {
                                log.debug('The user has been updated');
                                User.getById(req.user, function (err, userAction) {
                                    if (err || !userAction) {
                                        log.warn('User not found');
                                        return res.status(404).send({message: 'User not found'});
                                    } else {
                                        const obj = userAction.toObject();
                                        delete obj.providers.sample.password;
                                        res.status(200).send({user: obj});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });
}

function removeImagesInGallery(req, res) {
    log.trace('Enter in RemoveImagesInGallery');

    log.info(req.body.publicId);
    cloudinary.remove(req.body.publicId, {}, function (err, r) {
        if (err || !r) {
            log.fatal('Error in remove gallery image sdk', JSON.stringify(err));
            return res.status(400).send({message: 'Error in remove gallery image sdk', error: JSON.stringify(err)});
        } else {
            log.info('Cloudinary Galley Image Deleted: %s', JSON.stringify(r));

            User.update({_id: req.user}, {$pull: {gallery: {public_id: req.body.publicId}}}, function (error, u) {
                if (error || !u) {
                    log.warn('User not found or Not Updated: %s', JSON.stringify(error));
                    return res.status(400).send({
                        message: 'User not found or Not Updated',
                        error: JSON.stringify(error)
                    });
                } else {
                    User.getById(req.user, function (err, userAction) {
                        if (err || !userAction) {
                            log.warn('User not found');
                            return res.status(404).send({message: 'User not found'});
                        } else {
                            const obj = userAction.toObject();
                            delete obj.providers.sample.password;
                            res.status(200).send({user: obj});
                        }
                    });
                }
            });
        }
    });
}

function findPaymentsByUser (req, res) {
    log.trace('Enter in Get Payments');

    Payment.getPaymentsByUser(req.user, function (err, payments) {
        if (err || !payments.length) {
            log.warn('Payments not found: %s', JSON.stringify(err));
            res.status(404).send({message: 'Payments not found or Error', error: JSON.stringify(err)})
        } else {
            res.status(200).send(payments);
        }
    });
}

function searchBrCep (req, res) {
    log.trace('Enter in SearchBrCep');

    const zip_code = req.params.zipCode;

    cep(zip_code)
        .then(function (response) {
            log.info(JSON.stringify(response));
            res.status(200).send(response);
        })
        .catch(function (err) {
            log.warn(JSON.stringify(err));
            if(err.type ==='service_error'){
                res.status(400).send({message:err.message, code:err.name, error:JSON.stringify(err)});
            }else{
                res.status(404).send({message:err.message, code:err.name, error:JSON.stringify(err)});
            }
        });
}

export  default {
    me,
    updateProfile,
    deleteProfile,
    disableProfile,
    activeMoip,
    updateAvatar,
    getProfile,
    updateCoverImage,
    deleteCloudinaryCoverImage,
    insertImageOnGallery,
    removeImagesInGallery,
    findPaymentsByUser,
    searchBrCep,


}