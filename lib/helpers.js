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

helpers.createRandomString = function(len) {
    //check if length is number and its greater than zero
    const len__check = typeof len === 'number' && len > 0 ? len : false;
    const possible_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let str = '', char_tmp = '';
    if(len__check) {
        for(let i=0; i < len; i++) {
            char_tmp = possible_chars.charAt(Math.floor(Math.random() * possible_chars.length));

            str += char_tmp;
        }

        return str;
    }

    return false;

}

module.exports = helpers;