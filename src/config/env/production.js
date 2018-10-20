'use strict';

module.exports = {
    whitelist: [
        'http://your_domain.com',
        'https://your_domain.com',
        'https://prerender.io'
    ],
    database: {
        host: process.env.MONGO_URL || 'your_db_IP',
        database: process.env.MONGO_DB || 'your_db_project_name',
        user: process.env.MONGO_USER || 'your_user',
        password: process.env.MONGO_PASS || ''
    },
    log4js: {
        type: 'clustered',
        appenders: {
            everything: {type: 'file', filename: 'logs/app.log'},
            payments: {type: 'logLevelFilter', filename: 'logs/payments.log'},
            auth: {type: 'logLevelFilter', filename: 'logs/auth.log'},
            errors: {type: 'logLevelFilter', filename: 'logs/errors.log', appender: 'everything', level: 'error'},
            console: {type: 'console'}
        },
        categories: {
            errors: {appenders: [ 'errors' ], level: 'error'},
            payments: {appenders: [ 'payments' ], level: 'error'},
            auth: {appenders: [ 'payments' ], level: 'error'},
            default: {appenders: [ 'console', 'everything' ], level: 'debug'}
        },
        replaceConsole: true
    },
    mandrill: {
        key: process.env.MANDRILL_KEY || 'your_mandrill_key',
        from: process.env.MANDRILL_FROM || 'your_email@domain.com',
        from_name: process.env.MANDRILL_FROM_NAME || 'You Project Name',
        to: process.env.MANDRILL_TO || 'your_email@domain.com'
    },
    sendgrind:{
        key: process.env.SENDGRID_API_KEY || '',
        templateId: process.env.MY_TEMPLATE_ID || '',
        from: process.env.SENDGRID_FROM || '',
        from_name: process.env.SENDGRID_FROM_NAME || '',
        to: process.env.SENDGRID_TO || '',
        sandbox_mode: false
    },
    stripe: {
        secret_key: process.env.STRIPE_SECRET,
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
        mode: 'live',
        client_id: process.env.PAYPAL_KEY,
        client_secret: process.env.PAYPAL_SECRET
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
