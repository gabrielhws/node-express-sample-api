'use strict';

import config from '../config/config';
import swig from 'swig';
import async from 'async';
import path from 'path';
import log4js from 'log4js';
const log = log4js.getLogger('sendgrid');

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(config.sendgrind.key);

function sendMail(mail) {
    log.trace('Enter in Send');

    return new Promise((resolve, reject)=>{
        async.waterfall([
            function (next) {
                const layout = path.resolve('./src/templates/' + mail.page + '.html');
                swig.renderFile(layout, mail.body, function (err, emailHTML) {
                    if (err) {
                        log.fatal('Failed to create the email: %s', JSON.stringify(err));
                        reject({
                            message:'Failed to create the email',
                            error:JSON.stringify(err)
                        });
                    }
                    next(err, emailHTML);
                });
            },
            function (emailHTML) {
                const msg = {
                    to: mail.to,
                    from: mail.from,
                    subject: mail.subject,
                    html: emailHTML,
                    mail_settings: {
                        sandbox_mode: {
                            enable: config.sendgrind.sandbox_mode
                        }
                    }
                };
                sgMail.send(msg)
                    .then(function (resp) {
                        log.debug(JSON.stringify(resp));
                        resolve();
                    })
                    .catch(function (err) {
                        log.fatal(JSON.stringify(err));
                        reject({
                            message:'Failed to SendGrid NodeJS',
                            error:JSON.stringify(err)
                        });
                    });
            }
        ]);
    });
}

export default {
    sendMail
}

