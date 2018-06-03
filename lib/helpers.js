/**
 * Helpers for various tasks
 * 
 */

//dependencies
const sha = require('crypto'); 
const config = require('./config');

const helpers = {};


helpers.hash = function(data) {
    if(typeof(data) == 'string' && data.length > 0) {
        return sha.createHmac('sha256', config.hash_secret).update(data).digest('hex');
    } else {
        return false;
    }
}

helpers.parseJsonToObject = function(str) {
    try{
        var obj = JSON.parse(str);
        return obj;
    } catch(e) {
        return {};
    }
}

module.exports = helpers;