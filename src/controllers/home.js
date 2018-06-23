'use strict';
import log4js from "log4js";
import cep from 'cep-promise'

const log = log4js.getLogger('user');


function searchBrCep(req, res) {
    log.trace('Enter in SearchBrCep');

    const zip_code = req.params.zipCode;

    cep(zip_code)
        .then(function (response) {
            log.info(JSON.stringify(response));
            res.status(200).send(response);
        })
        .catch(function (err) {
            log.warn(JSON.stringify(err));
            if(err.type ==='service_error'){
                res.status(400).send({message:err.message, code:err.name, error:JSON.stringify(err)});
            }else{
                res.status(404).send({message:err.message, code:err.name, error:JSON.stringify(err)});
            }
        });

}

export default{
    searchBrCep
}