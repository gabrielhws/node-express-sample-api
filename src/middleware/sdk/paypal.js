'use strict';
import paypal from 'paypal-rest-sdk';
import config from '../../config/config';


exports.order = function(payment, next){
    paypal.configure({
        mode: config.paypal.mode,
        client_id: config.paypal.client_id,
        client_secret: config.paypal.client_secret
    });

    config.paypal_payment.transactions[0].amount.currency = payment.currency;
    config.paypal_payment.transactions[0].amount.total = parseFloat(payment.amount).toFixed(2);
    config.paypal_payment.redirect_urls.return_url = config.domain_2 + __('/b/paypal/execute') + '/' + payment._id;
    config.paypal_payment.redirect_urls.cancel_url = config.domain_2 + __('/b/paypal/cancel') + '/' + payment._id;
    config.paypal_payment.transactions[0].description = payment.description;
    paypal.payment.create(config.paypal_payment, {}, function (err, res){
        next(err, res);
    });
};

exports.orderExecute = function(_id, payer_id, next){
    paypal.configure({
        mode: config.paypal.mode,
        client_id: config.paypal.client_id,
        client_secret: config.paypal.client_secret
    });
    paypal.payment.execute(_id, { payer_id : payer_id }, {}, function (err, res) {
        next(err, res);
    });
};