'use strict';

module.exports = {
    port: process.env.PORT || 3001,
    domain: process.env.DOMAIN_REST || 'https://your_domain.com',
    domain_2: process.env.DOMAIN_REST || 'https://your_domain.com',
    title: 'NodeJs Sample API',
    email: 'your_email@domain.com',
    token_secret: process.env.TOKEN_SECRET || 'sample',
    header_secret: process.env.HEADER_SECRET || 'sample',
    template_engine: 'swig',
    facebook: {
        access_token_url: 'https://graph.facebook.com/v2.11/oauth/access_token',
        api_url: 'https://graph.facebook.com/v2.11/me?fields=email,gender,currency,age_range,first_name,last_name, name',
        client_id: process.env.FACEBOOK_ID || '',
        client_secret: process.env.FACEBOOK_SECRET || ''
    },
    google: {
        access_token_url: 'https://accounts.google.com/o/oauth2/token',
        api_url: 'https://www.googleapis.com/oauth2/v1/userinfo',
        client_id: process.env.GOOGLE_ID || '',
        client_secret: process.env.GOOGLE_SECRET || ''

    },
    paypal_payment: {
        intent: 'sale',
        payer: {
            payment_method: 'paypal'
        },
        redirect_urls: {},
        transactions: [{
            amount: {
                currency: 'BRL'
            }
        }]
    },
    cloudinary:{
        cloud_name: '',
        api_key: '',
        api_secret: ''
    }
};

