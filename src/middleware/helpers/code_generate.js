'use strict';
import log4js from 'log4js';
import Promise from 'bluebird';
const log = log4js.getLogger('code_generate');


/**
 * Generate a Code
 * @param {Number} param - The length Array for Model Object
 */

function generateSimpleSequentialCode(param) {
    log.trace('Enter in Generate Code');

    if (!param) {
        return Promise.reject(Error('bad param'))
    }

    return new Promise(function(resolve, reject){
        let str = '' + param;
        let pad = '0000000';
        let result = pad.substring(0, pad.length - str.length) + str;
        log.debug(JSON.stringify(result));

        resolve(result);
    });

}

export default { generateSimpleSequentialCode};