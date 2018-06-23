'use strict';

import config from '../config/config';
import log4js from 'log4js';
import cloudinary from 'cloudinary';
const log = log4js.getLogger('cloudinary');


cloudinary.config(config.cloudinary);

function send (imageFile, tags, folder, cb) {
    log.trace('Enter in Send to Cloudinary.');

    cloudinary.v2.uploader.upload(imageFile, {tags:tags, folder:folder}, cb);
}

function remove(publicId, options, cb) {
    log.trace('Delete Image on Cloudinary.');

    cloudinary.v2.uploader.destroy(publicId, options, cb);
}

export default{
    send,
    remove
}

