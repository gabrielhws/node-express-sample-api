'use strict';


import Mongoose from "mongoose";
import config from "../config/config.js";
import log4js from "log4js";
import _ from "lodash";
const log = log4js.getLogger('startup');
const env = _.get(process.env, 'NODE_ENV', 'development');

let url = '';

if(env === 'local'){
    log.info('Local DB Start - NODE_ENV: [%s]', env);
    url = 'mongodb://' + config.database.host + '/' + config.database.database;
}else{
    log.info('NODE_ENV: [%s]', env );
    url = 'mongodb://' + config.database.user + ':' + config.database.password + '@' + config.database.host + '/' + config.database.database;
}

Mongoose.Promise = global.Promise;
Mongoose.connect(url);
const db = Mongoose.connection;

db.on('error', function (err) {
    log.fatal(JSON.stringify(err));
});
db.once('open', function callback() {
    log.info('Connection with NodeJs Sample API DB succeeded.');
});

// When the connection is disconnected
db.on('disconnected', function () {
    log.info('Mongoose default connection disconnected');
});
// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
    db.close(function () {
        log.info('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

exports.Mongoose = Mongoose;
exports.mongo = db;