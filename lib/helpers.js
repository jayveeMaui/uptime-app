/**
 * Helpers for various tasks
 * 
 */

//dependencies
const sha = require('crypto'); 
const config = require('./config');

const https = require('https');
const querystring = require('querystring')

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

helpers.sendTwillioSms = function(phone,msg, callback) {
    phone = typeof phone == 'string' && phone.trim().length == 10 ? phone.trim : false;
    msg = typeof msg == 'string' && msg.trim().length <= 150 ? msg.trim() : false;

    if(phone && msg) {
        const payload = {
            From :  config.twilio.from_phone,
            To: '+63'+ phone,
            Body: msg
        }

        const string_payload = querystring.stringify(payload);

        const request_details = {
            protocol: 'https',
            hostname : 'api.twilio.com',
            method : 'POST',
            path : '/2010-04-01/Accounts/'+ config.twilio.account_SID+'/Messages.json',
            auth : config.twilio.account_SID+':'+ config.twilio.auth_token,
            headers : {
                'Content-Type' : 'application/x-www-fomr-urlencoded',
                'Content-Length' : Buffer.byteLength(string_payload)
            }
        }

        //instantiate request
        const req = https.request(request_details, function(res){
            const status = res.statusCode;

            if(status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was '+ status);
            }
        });
        
        req.on('error', function(e){
            callback(e)
        })

        req.write(string_payload);

        req.end();
        
    } else {
        callback('Given parameters were missing or invalid')
    }
}

module.exports = helpers;