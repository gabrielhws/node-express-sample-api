'use strict';

import config from "../config/config";
import errors from "./errors";
import path from "path";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import express from "express";
import cors from "cors";
import log4js from "log4js";
import consolidate from "consolidate";
import user_agent from "express-useragent";


module.exports = function (db) {
    const app = express();

    // Globbing model files
    config.getGlobbedFiles('./src/models/*.js').forEach(function (modelPath) {
        require(path.resolve(modelPath));
    });

    let whitelist = config.whitelist;
    let corsOptions = {
        origin: function (origin, callback) {
            let originIsWhitelisted = whitelist.indexOf(origin) !== -1;
            callback(null, originIsWhitelisted);
        }
    };

    app.use(cors(corsOptions));
    app.use(user_agent.express());
    app.disable('etag');
    app.use(log4js.connectLogger(log4js.getLogger('http'), {level: 'auto'}));
    app.use(bodyParser.json({limit: '10mb'}));
    app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
    app.use(methodOverride());
    app.use(errors.handler);


    // Globbing routing files
    config.getGlobbedFiles('./src/routes/*.js').forEach(function (routePath) {
        require(path.resolve(routePath))(app);
    });

    // Set swig as the template engine
    app.engine('html', consolidate[config.template_engine]);
    app.locals.cache = 'memory';

    // Set views path and view engine
    app.set('view engine', 'html');
    app.set('views', './src/templates');

    // Return Express server instance
    return app;
};
