'use strict';

import config from '../config/config';
import swig from 'swig';
import async from 'async';
import path from 'path';
import node_mandrill from 'node-mandrill';
import log4js from 'log4js';

const mandrill = node_mandrill(config.mandrill.key);
const log = log4js.getLogger('mandrill');

exports.send = function (mail, done) {
    log.trace('Mandrill has been started');
    async.waterfall([
        function (next) {
            const layout = path.resolve('./src/templates/' + mail.page + '.html');
            swig.renderFile(layout, mail.body, function (err, emailHTML) {
                if (err) log.fatal('Failed to create the email: %s', JSON.stringify(err));
                next(err, emailHTML);
            });
        },
        // If valid email, send reset email using service
        function (emailHTML) {
            mandrill('/messages/send', {
                message: {
                    to: mail.to,
                    from_email: mail.from,
                    from_name: mail.name,
                    subject: mail.subject,
                    html: emailHTML
                }
            }, function (err, res) {
                done(err, res);
            });
        }
    ]);
};
