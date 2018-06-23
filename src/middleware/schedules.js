'use strict';

import schedule from 'node-schedule';
import log4js from 'log4js';
const log = log4js.getLogger('schedules');

exports.runner = function (rules, param) {
    let j = schedule.scheduleJob(rules, param);
    if (j) log.info(rules.name + ' has been started');
    else  log.fatal(rules.name + ' hasn\'t been started');
};