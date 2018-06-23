'use strict';

import auth from "../middleware/auth";
import users from "../controllers/users";

module.exports = function (app) {

    app.route('/user/me')
        .get(auth.hasTokenHeader, auth.hasAuthorization, users.me)
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.updateProfile)
        .delete(auth.hasTokenHeader, auth.hasAuthorization, users.deleteProfile);

    app.route('/user/disable')
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.disableProfile);

    app.route('/user/avatar')
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.updateAvatar);

    app.route('/user/gallery/:imageId')
        .put(auth.hasTokenHeader, auth.hasAuthorization, users.removeImagesInGallery);

    app.route('/user/activeMoip')
        .post(auth.hasTokenHeader, auth.hasAuthorization, users.activeMoip);
};