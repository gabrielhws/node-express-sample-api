'use strict';
import _ from 'lodash';
import facebook from './strategies/facebook/strategy';
import google from './strategies/google/strategy';
import sample from './strategies/sample/strategy';

module.exports = _.extend(facebook, google, sample);