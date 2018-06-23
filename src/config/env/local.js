'use strict';

module.exports = {
    whitelist: [
        'http://localhost:your_port'
    ],
    database: {
        host: process.env.MONGO_URL || '127.0.0.1:27017',
        database: process.env.MONGO_DB || 'node-sample-api'
    },
    log4js: {
        appenders: {
            app: {type: 'file', filename: 'logs/dev.app.log'},
            console: {type: 'console'}
        },
        categories: {
            default: {appenders: ['console', 'app'], level: 'trace'}
        }
    },
    mandrill: {
        key: process.env.MANDRILL_KEY || 'your_mandrill_key_test',
        from: process.env.MANDRILL_FROM || 'your_email@domain.com',
        from_name: process.env.MANDRILL_FROM_NAME || 'You Project Name',
        to: process.env.MANDRILL_TO || 'your_email@domain.com'
    },
    stripe: {
        secret_key: process.env.STRIPE_SECRET || 'your_secret_key_test',
        currency: 'BRL',
        messages: {
            incorrect_number: 'The credit card number is incorrect.',
            invalid_number: 'The credit card number is invalid.',
            invalid_expiry_month: 'The credit card expiration month is invalid.',
            invalid_expiry_year: 'The credit card expiration year is invalid.',
            invalid_cvc: 'The credit card verification code is invalid.',
            expired_card: 'The credit card has been expired.',
            incorrect_cvc: 'The credit card verification code is incorrect.',
            incorrect_zip: 'The credit card zipcode validation has been failed.',
            card_declined: 'The credit card has been declined.',
            missing: 'The client dont have credit card.',
            processing_error: 'An error occurred while processing the credit card.',
            rate_limit:  'An error occurred because the API was queried too quickly. Please let us know if you receive this error continuously.'
        }
    },
    paypal: {
        mode: 'sandbox', //sandbox or live
        client_id: process.env.PAYPAL_KEY || 'your_client_id',
        client_secret: process.env.PAYPAL_SECRET || 'your_client_secret'
    },
    moip: {
        id: '',
        access_token: '',
        url: '',
        descriptor: '',
        oauth: {
            id: '',
            website: '',
            accessToken: '',
            description: '',
            name: '',
            secret: '',
            redirectUri: '',
            createdAt: '',
            updatedAt: ''
        }
    }
};

