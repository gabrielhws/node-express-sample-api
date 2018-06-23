import Stripe from 'stripe';
import config from '../../../config/config';
import log4js from 'log4js';

const stripe = new Stripe(config.stripe.secret_key);
const log = log4js.getLogger('stripe');

function create(payment, cb) {

    const charge = {
        amount: parseFloat(payment.amount * 100).toFixed(0),
        currency: payment.currency,
        source: payment.handler.payment_id,
        customer: undefined,
        description: payment.description
    };

    log.debug(charge);

    stripe.charges.create(charge,
        function (err, charge) {
            if (err) {
                log.warn('Stripe charge failed [%s] to this payment %s', JSON.stringify(err), payment._id);
                let message = config.stripe.messages[err.code] ? config.stripe.messages[err.code] : 'An error occurred while processing the payment';
                cb(message, charge);
            } else {
                cb(null, charge);
            }
        }
    );
}

export default { create };