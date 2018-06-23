'use strict';

import auth from '../middleware/auth';

module.exports = function (app) {

    app.route('/auth/unlink')
        .post(auth.hasTokenHeader, auth.hasAuthorization, auth.unlink);

    app.route('/auth/password')
        .post(auth.hasTokenHeader, auth.hasAuthorization, auth.setPassword)
        .put(auth.hasTokenHeader, auth.hasAuthorization, auth.changePassword);

    app.route('/auth/reset/:token')
        .get(auth.hasTokenHeader, auth.validateResetToken)
        .post(auth.hasTokenHeader, auth.reset);

    app.route('/auth/signin')
        .post(auth.hasTokenHeader, auth.signIn);

    app.route('/auth/signup')
        .post(auth.hasTokenHeader, auth.signUp);

    app.route('/auth/forgot/password')
        .post(auth.hasTokenHeader, auth.forgot);

    // Setting the facebook oauth routes
    app.route('/auth/facebook').post(auth.hasTokenHeader, auth.facebook);
    app.route('/auth/google').post(auth.hasTokenHeader, auth.google);

    app.route('/auth/confirmation')
        .post(auth.hasTokenHeader, auth.hasAuthorization, auth.confirmationAccountResend);

    app.route('/auth/confirmation/:token')
        .put(auth.hasTokenHeader, auth.hasAuthorization, auth.confirmationAccount);

};