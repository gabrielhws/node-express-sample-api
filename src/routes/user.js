'use strict';

import auth from "../middleware/auth";
import users from "../controllers/users";

module.exports = function (app) {

    app.route('/users/me')
        .get(auth.hasTokenHeader, auth.hasAuthorization, users.me)
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.updateProfile)
        .delete(auth.hasTokenHeader, auth.hasAuthorization, users.deleteProfile);

    app.route('/users/disable')
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.disableProfile);

    app.route('/users/avatar')
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.updateAvatar);

    app.route('/users/gallery/:imageId')
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.removeImagesInGallery);

    app.route('/users/activeMoip')
        .post(auth.hasTokenHeader, auth.hasAuthorization, users.activeMoip);
};