'use strict';

import config from "../../config/config";
import request from "request";
import moment from "moment";
import _ from "lodash";
import log4js from "log4js";

const log = log4js.getLogger('moip');
const channels = '/v2/channels';
const accounts = '/v2/accounts';
const accountsExists = '/v2/accounts/exists';
const orders = '/v2/orders';
const customers = '/v2/customers';


/**
 * Verify if the exist account to user on moip
 * @param taxDocument
 * @returns {Promise}
 */
function accountExists(taxDocument) {
    log.trace('Moip checking user merchant exists');
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + config.moip.access_token
            },
            qs: {'tax_document': taxDocument},
            json: true
        };

        options.url = config.moip.url + accountsExists;
        request.get(options, function (err, res, json) {
            switch (res.statusCode) {
                case 200:
                    log.info('The user %s already has a merchant account.', taxDocument);
                    resolve({existingUser: true});
                    break;
                case 400:
                    log.info('The user %s didn\'t have a merchant account yet!', taxDocument);
                    resolve({existingUser: false});
                    break;
                default:
                    reject(json);
            }
        });

    });
}

/**
 * Create the merchant account the guides
 * @param user
 * @returns {Promise}
 */
function createAccount(user) {
    return new Promise((resolve, reject) => {
        accountExists(user.cpf)
            .then((data) => {
                if (!data.existingUser) {
                    log.trace('Moip creating account merchant');
                    let account = {
                        "email": {"address": user.email},
                        "person": {
                            "name": user.firstName,
                            "lastName": user.lastName,
                            "taxDocument": {
                                "type": "CPF",
                                "number": user.cpf
                            },
                            "phone": {
                                "countryCode": "55",
                                "areaCode": "11",
                                "number": "965213244"
                            },
                            "birthDate": moment(user.birth_date).format('YYYY-MM-DD'),
                            "address": {
                                "city": user.address.city,
                                "complement": user.address.address_2,
                                "district": user.address.city,
                                "street": user.address.address,
                                "streetNumber": user.address.number,
                                "zipCode": user.address.zip_code,
                                "state": 'MG',
                                "country": "BRA"
                            }
                        },
                        "type": "MERCHANT"
                    };

                    const options = {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Basic ' + config.moip.access_token
                        },
                        body: account,
                        json: true
                    };

                    options.url = config.moip.url + accounts;
                    request.post(options, function (err, res, json) {
                        log.trace('Moip returning account merchant state');
                        if (res.statusCode !== 201) {
                            log.debug('Error while create the merchant: %s', JSON.stringify(res));
                            reject(json);
                        } else resolve(json);

                    });
                } else reject({message: 'The user already has a moip account, set the moip merchant ID'})

            })
            .catch((err) => reject(err));


    });
}

/**
 * Create the user on MoIP handler
 *
 * @param user
 * @returns {Promise}
 */
function createUser(user) {
    return new Promise((resolve, reject) => {
        let customer = {
            "ownId": user._id,
            "fullname": user.displayName,
            "email": user.email,
            "birthDate": moment(user.birth_date).format('YYYY-MM-DD'),
            "taxDocument": {
                "type": "CPF",
                "number": user.cpf
            },
            "shippingAddress": {
                "city": user.address.city,
                "complement": user.address.address_2,
                "district": user.address.city,
                "street": user.address.address,
                "streetNumber": user.address.number,
                "zipCode": user.address.zip_code,
                "state": user.address.province,
                "country": "BRA"
            }
        };

        const options = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + config.moip.access_token
            },
            body: customer,
            json: true
        };

        options.url = config.moip.url + customers;
        request.post(options, function (err, res, json) {
            if (res.statusCode !== 201) {
                log.debug('Error while creating user: %s', JSON.stringify(json));
                reject(json);
            } else resolve(json)
        });

    });
}

/**
 * Create the order on Moip Handler
 *
 * @param user
 * @param booking
 * @returns {Promise}
 */
function createOrder(user, booking) {
    return new Promise((resolve, reject) => {
        let order = {
            ownId: config.moip.id,
            items: [
                {
                    product: booking.schedule.activity.name,
                    quantity: booking.peoples.length,
                    category: 'OTHER_CATEGORIES',
                    detail: booking.charges.price.description,
                    price: booking.charges.total * 100
                }
            ],
            customer: {}

        };

        // Create the promise that will check if the user has a moip customerId
        const checkCustomer = new Promise((resolve, reject) => {
            // Verify if the user has the field id on moip field
            // else, create the user on moip and save it
            const existingMoip = _.get(user, 'moip.id', false);
            if (existingMoip) {
                order.customer.id = user.moip.customer_id;
                log.info('Using the default user value %s from Moip', user.moip.customer_id);
                resolve();
            } else {
                log.info('Creating user %s on Moip', user._id);
                createUser(user)
                    .then((data) => {
                        user.moip.customer_id = data.id;
                        user.moip.original_costumer = data;
                        user.save();

                        order.customer.id = user.moip.customer_id;
                        resolve();
                    })
                    .catch((err) => {
                        reject(err)
                    });
            }
        });

        checkCustomer
            .then(() => {
                log.trace('Creating the order to the user %s', user.moip.customer_id);
                const options = {
                    headers: {
                        'Authorization': 'Basic ' + config.moip.access_token
                    },
                    body: order,
                    json: true
                };

                options.url = config.moip.url + orders;
                request.post(options, function (err, res, json) {
                    if (res.statusCode !== 201) {
                        log.warn('Error while creating order: %s', JSON.stringify(json));
                        reject(json);
                    } else {
                        log.debug('Get the order %s', json.id);
                        resolve(json)
                    }
                });
            })
            .catch((err) => {
                log.warn('Get an error: %s', JSON.stringify(err));
                reject(err)
            });
    });
}


/**
 * Charge the payment and made the validation
 *
 * @param form
 * @param user
 * @param booking
 * @returns {Promise}
 */
function chargePayment(form, user, booking) {
    return new Promise((resolve, reject) => {
        let payment = {
            installmentCount: 1,
            statementDescriptor: config.moip.descriptor,
            fundingInstrument: {
                method: 'CREDIT_CARD',
                creditCard: {
                    hash: form.creditCard,
                    store: false,
                    holder: {
                        birthdate: moment(form.holder.birthDate).format('YYYY-MM-DD'),
                        taxDocument: {
                            type: 'CPF',
                            number: form.holder.taxDocument
                        },
                        fullname: form.holder.fullName
                    }
                }
            }
        };
        createOrder(user, booking)
            .then((data) => {

                const options = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + config.moip.access_token
                    },
                    body: payment,
                    json: true
                };

                options.url = config.moip.url + orders + '/' + data.id + '/payments';
                request.post(options, function (err, res, json) {
                    if (res.statusCode !== 201) {
                        log.warn('Error while charging the payment: %s', JSON.stringify(json));
                        reject(json);
                    } else {
                        log.debug('Creating payment %s', json.id);
                        resolve(json)
                    }

                });
            })
            .catch((err) => {
                reject(err)
            });
    });
}

export default {createAccount, createUser, createOrder, chargePayment};