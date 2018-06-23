'use strict';

import auth from "../middleware/auth";
import home from "../controllers/home";


module.exports = function (app) {
    app.route('/')
        .get(function (req, res) {
            res.status(200).send({message: 'RESTful NodeJs Sample running =D'});
        });

    app.route('/core/cep/:zipCode')
        .get(auth.hasTokenHeader, home.searchBrCep);
};