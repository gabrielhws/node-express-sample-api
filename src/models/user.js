'use strict';

/**
 * User dependencies.
 */

import mongoose from "mongoose";
import moment from "moment";
import bcrypt from "bcryptjs";
import config from "../config/config";
import jwt from "jwt-simple";
import crypto from "crypto";
import mandrill from "../middleware/mandrill";
import sendgrid from "../middleware/sendgrid";
import log4js from "log4js";

const Schema = mongoose.Schema;
const log = log4js.getLogger('user');

/**
 * User Schema
 */

const UserSchema = new Schema({
    displayName: {
        type: String,
        trim: true
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        unique: true,
        lowercase: true
    },
    username: {
        type: String,
        trim: true,
        unique: true,
        lowercase: true
    },
    roles: {
        type: String,
        enum: [ 'user', 'admin'],
        default: [ 'user' ]
    },
    birth_date:  Date,
    marital_status:String,
    gender: {
        type: String,
        enum: [ 'male', 'female', 'other' ]
    },
    image: String,
    image_public_id:String,
    cover_image: {},
    gallery: [],
    cover_video: {
        id: String,
        url: String,
        source: {
            type: String,
            enum: ['vimeo', 'youtube']
        }
    },
    cpf: String,
    cnpj: String,
    document: String,
    location:{
        lat_lng: [Number],
        reference:String
    },
    timezone: String,
    preferred_language: {
        type: String,
        enum: [ 'en', 'es', 'pt' ],
        default: [ 'pt' ],
    },
    preferred_currency: {
        type: String,
        enum: [ 'eur', 'usd', 'brl', 'gbl' ],
        default: [ 'brl' ]
    },
    languages: [
        {
            ico: String,
            name: String,
            code: String
        }
    ],
    moip: {
        customer_id: String,
        merchant_id: String,
        original_costumer: {},
        original_merchant: {}
    },
    stripe: {},
    paypal:{},
    address: {
        zip_code: String,
        address: String,
        address_2: String,
        number: String,
        city: String,
        province: String,
        country: String,
        country_code:String,
        neighborhood:String
    },
    providers: {
        sample: {
            has: {
                type: Boolean,
                default: false
            },
            locate: {
                type: String
            },
            password: {
                type: String,
                select: false
            },
            resetPasswordToken: {
                type: String,
                select: false
            },
            resetPasswordExpires: {
                type: Date,
                select: false
            }
        },
        facebook: {},
        google: {},
        github:{},
        linkedin:{}
    },
    notifications: {
        email_notification: {}
    },
    configuration:{
        privacy:{},
        profile:{},
        security:{}
    },
    active: {
        type: Boolean,
        default: true
    },
    verified: {
        type: Boolean,
        default: false,
        required: true
    },
    verified_token: {
        type: String,
        select: false
    },
    verified_token_expires: {
        type: Date,
        select: false
    },
    created: {
        type: Date,
        default: Date.now
    }
});

/**
 * Hook a pre save method to hash the password
 */

UserSchema.pre('save', function (next) {
    const user = this;
    if (!user.isModified('providers.sample.password')) {
        return next();
    } else {
        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(user.providers.sample.password, salt, function (err, hash) {
                user.providers.sample.password = hash;
                next();
            });
        });
    }
});

UserSchema.post('save', function (doc) {
    log.debug('%s has been saved', doc._id);
});

UserSchema.post('update', function (doc) {
    log.debug('%s has been updated', doc._id);
});

UserSchema.post('remove', function (doc) {
    log.debug('%s has been removed', doc._id);
});

/**
 * Create instance method for authenticating user
 */
UserSchema.methods.comparePassword = function (password, done) {
    bcrypt.compare(password, this.providers.sample.password, function (err, isMatch) {
        done(err, isMatch);
    });
};

UserSchema.methods.createToken = function (user) {
    const payload = {
        sub: user._id,
        iat: moment().unix(),
        exp: moment().add(14, 'days').unix()
    };
    return jwt.encode(payload, config.token_secret);
};


UserSchema.statics.getById = function (id, cb) {
    log.trace('Enter in GetById');

    return this.findById(id)
        .exec(cb);
};

UserSchema.statics.getByUsername = function (username, cb) {
    log.trace('Enter in GetByUsername');

    return this.findOne({username:username})
        .exec(cb);
};

UserSchema.statics.findUniqueUsername = function (username, suffix, callback) {
    const _this = this;
    let possibleUsername = username + (suffix || '');

    _this.findOne({
        username: possibleUsername
    }, function (err, user) {
        if (!err) {
            if (!user) {
                callback(possibleUsername);
            } else {
                return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
            }
        } else {
            callback(null);
        }
    });
};


UserSchema.statics.getByEmail = function (email, cb) {
    log.trace('Enter in Find User By Email');

    return this.findOne({email: email}).exec(cb);
};

UserSchema.statics.sendResetPasswordEmail = function (domain, token, user) {
    log.trace('Enter in SendResetPasswordEmail');
    let mail = {
        page: 'auth/reset-password-email',
        body:{
            displayName: user.displayName,
            url: domain + '/p/reset/' + token
        },
        to: [ {email: user.email, name: user.displayName} ],
        from: config.mandrill.from,
        name: config.mandrill.from_name,
        subject: 'Redefinição de Senha'
    };
    mandrill.send(mail, function (err, data) {
        if (err || data.status === 'rejected') {
            log.fatal('Failed to send the email: %s', err || data);
        } else {
            log.debug('Reset email created.');
        }
    });
    sendgrid.sendMail(mail)
        .then(function () {
            log.info('Reset email created.');
        })
        .catch(function (e) {
            log.fatal('Failed to send the email: %s', e.error);
        });
};

UserSchema.statics.sendConfirmAccount = function (origin, user) {
    log.trace('Enter in SendConfirmAccount');
    const _this = this;
    let page = '';
    let body = {};
    let subject = '';

    _this.findById(user._id)
        .exec(function (err, u) {
            if (err || !u) {
                log.warn('User not found');
            } else {
                crypto.randomBytes(20, function (err, buffer) {
                    u.verified_token = buffer.toString('hex');
                    u.verified_token_expires = Date.now() + 259200000; // 3 days
                    u.isModified();
                    u.save(function (err) {
                        if (err) {
                            log.warn('User not updated:%s', JSON.stringify(err));
                        }
                        else {
                            page = 'auth/confirm-account';
                            subject = 'Bem Vindo ao [sample]';
                            body = {
                                name: user.displayName,
                                appName: config.title,
                                url: origin + '/active/account/' + u.verified_token,
                                supportEmail: config.email_2
                            };
                            let mail = {
                                page: page,
                                body: body,
                                to: [ {email: u.email, name: u.displayName} ],
                                from: config.mandrill.from,
                                name: config.mandrill.from_name,
                                subject: subject
                            };
                            mandrill.send(mail, function (err, data) {
                                if (err || data.status === 'rejected') {
                                    log.fatal('Failed to send the email: %s', err || data);
                                } else {
                                    log.debug('Confirm email created.');
                                }
                            });
                        }
                    });
                });
            }
        });
};


export default mongoose.model('User', UserSchema);