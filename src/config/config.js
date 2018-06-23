import _ from 'lodash';
import log4js from 'log4js';
import  glob from 'glob';

const log = log4js.getLogger('startup');

function init() {
    const environmentFiles = glob.sync('./src/config/env/' + process.env.NODE_ENV + '.js');
    if (!environmentFiles.length) {
        if (process.env.NODE_ENV) {
            log.error('No configuration file found for "' + process.env.NODE_ENV + '" environment using development instead');
        } else {
            log.error('NODE_ENV is not defined! Using default development environment');
        }
        process.env.NODE_ENV = 'development';
    }
}
init();

import all from './env/all';
const env = require('./env/' + process.env.NODE_ENV) || {};
// Load app configurations
module.exports = _.extend(all,env);

/**
 * Get files by glob patterns
 */
module.exports.getGlobbedFiles = function (globPatterns, excludes) {
    // For context switching
    const _this = this;
    // URL paths regex
    let urlRegex = new RegExp('^(?:[a-z]+:)?\/\/', 'i');
    // The output array
    let output = [];
    // If glob pattern is array then we use each pattern in a recursive way, otherwise we use glob
    if (_.isArray(globPatterns)) {
        globPatterns.forEach(function (globPattern) {
            output = _.union(output, _this.getGlobbedPaths(globPattern, excludes));
        });
    } else if (_.isString(globPatterns)) {
        if (urlRegex.test(globPatterns)) {
            output.push(globPatterns);
        } else {
            let files = glob.sync(globPatterns);
            if (excludes) {
                files = files.map(function (file) {
                    if (_.isArray(excludes)) {
                        for (let i in excludes) {
                            if (excludes.hasOwnProperty(i)) {
                                file = file.replace(excludes[i], '');
                            }
                        }
                    } else {
                        file = file.replace(excludes, '');
                    }
                    return file;
                });
            }
            output = _.union(output, files);
        }
    }
    return output;
};