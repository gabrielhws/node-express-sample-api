'use strict';

import log4js from 'log4js';
const log = log4js.getLogger('http');

exports.handler = function (err, req, res, next) {
    if (err instanceof SyntaxError) {
        log.warn(JSON.stringify(err));
        return res.status(500).send({message: 'Something wrong!'});
    } else {
        log.warn(JSON.stringify(err));
        return res.status(500).send({message: 'Something wrong!'});
    }
    next();
};
