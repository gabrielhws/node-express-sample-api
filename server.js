'use strict';

import log4js from 'log4js';
import Express from './src/middleware/express';
import config from './src/config/config';
import db from './src/middleware/db';

log4js.configure(config.log4js);
const log = log4js.getLogger('startup');
const app = Express(db.Mongoose);

app.listen(config.port);

export default{
    app
};

log.info('RESTful API Node.js running in port:' + config.port);
