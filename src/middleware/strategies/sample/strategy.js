'use strict';

import _ from 'lodash';
import authentication from './authentication';
import authorization from './authorization';
import password from './password';

module.exports = _.extend(authentication, authorization, password);