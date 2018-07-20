/**
 * Worker related tasks
 */


const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helper = require('./helpers');
const url = require('url');
const _logs = require('./logs')


const workers = {};

workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    }, 1000 * 60)
}

workers.rotateLogs = function() {
    //list all the none compressed log files

    _logs.list(false, function(err, logs) {
        if(!err && logs && logs.length > 0) {
            logs.forEach(function(log_name){
                const log_id = log_name.replace('.log', '');
                const new_id = log_id+'-'+Date.now();

                logs.compress(log_id, new_id, function(err){
                    if(!err) {
                        _logs.truncate(log_id, function(err){
                            if(!err) {
                                console.log('success truncating log file')
                            } else {
                                console.log('failed truncating log file')
                            }
                        })
                    } else {
                        console.log('Error compressing one of the log file', err)
                    }
                })
            })
        } else {
            console.log('Error: could not fine any logs to rotate');
        }
    })
}

workers.logRotationLoop = function(){
    setInterval(function(){
        workers.rotateLogs();
    }, 1000 * 60 * 60 *24)
}
workers.log =function(check_data, check_outcome, state, alert_warranted, time_of_check) {
    const log_data = {
        "check" : check_data,
        "outcome" : check_outcome,
        "state" : state,
        "alert" : alert_warranted,
        "time" : time_of_check
    }

    //convert data to a string 
    const log_str = JSON.stringify(log_data);
    //log filename
    const log_filename = check_data.id;

    _logs.append(log_filename, log_str, function(err) {
        if(!err) {
            console.log('Logging to file succeeded!')
        } else {
            console.log('Logging to file failed!')
        }
    })

}

workers.gatherAllChecks = function(){
    _data.list('checks', function(err, checks) {
        if(!err && checks && checks.length > 0 ) {
            checks.forEach(function(check){
                _data.read('checks', check, function(err, original_check_data){
                    if(!err && original_check_data) {
                        //pass to check validator
                        workers.validateChecks(original_check_data);
                    } else {
                        console.log('Error reading one the checks data')
                    }
                })
            })
        } else {
            console.log('Error: could not find any checks to process');
        }
    })
}

workers.validateChecks = function(check_data){
    //sanity checking 
    check_data = typeof check_data == 'object' && check_data != null ? check_data : {};
    check_data.id = typeof check_data.id == 'string' && check_data.id.trim().length == 20 ? check_data.id.trim() : false;
    check_data.phone = typeof check_data.user_phone == 'string' && check_data.user_phone.trim().length == 10 ? check_data.user_phone.trim() : false;
    check_data.protocol = typeof check_data.protocol == 'string' && ['https', 'http'].indexOf(check_data.protocol) >= 0 ? check_data.protocol.trim() : false;
    check_data.url = typeof check_data.url == 'string' && check_data.url.trim().length > 0 ? check_data.url.trim() : false;
    check_data.method = typeof check_data.method == 'string' && ['post', 'get','put', 'delete'].indexOf(check_data.method) >= 0 ? check_data.method.trim() : false;
    check_data.success_code = typeof check_data.success_code === 'object' && check_data.success_code instanceof Array && check_data.success_code.length > 0 ?  check_data.success_code : false;
    check_data.timeout = typeof check_data.timeout === 'number' && check_data.timeout % 1 === 0 && check_data.timeout > 1 ?  check_data.timeout : false;

    //set the keys 
    check_data.state = typeof check_data.state == 'string' && ['up', 'down'].indexOf(check_data.state) >= 0 ? check_data.state : 'down';
    check_data.last_check = typeof check_data.last_check === 'number'  && check_data.last_check > 0 ?  check_data.last_check : false;

    //check if all is passed
    if(check_data.id &&
        check_data.phone &&
        check_data.protocol &&
        check_data.url &&
        check_data.method &&
        check_data.success_code &&
        check_data.timeout
    ) {
        workers.performCheck(check_data);
    } else {
        console.log("Error: One of the element is not properly formatted. skip test. ", check_data);
    }

}

workers.performCheck = function(check_data) {
    const result = {
        'error': false,
        'response_code': false
    }
    let outcome = false;

    //parse the hostname
    const parsed_url = url.parse(check_data.protocol+'://'+check_data.url, true);
    const hostname = parsed_url.hostname;
    const host_path = parsed_url.path;

    const req_details = {
        'protocol': check_data.protocol+':',
        'hostname': hostname,
        'method': check_data.method.toUpperCase(),
        'path': host_path,
        'timeout': check_data.timeout * 1000
    }

    var module_to_use = check_data.protocol == 'http' ? http : https;

    const req = module_to_use.request(req_details, function(res){
        //grab the status of sent request
        const status = res.statusCode;

        //update the checkoutcome and pass the data along
        result.response_code = status;
        if(!outcome) {
            workers.processCheckOutcome(check_data, result);
            outcome = true;
        }
    })

    //bind to the error
    req.on('error', function(err){
        //update the checkoutcome and pass the data along
        result.error = {
            'error' : true,
            value : err
        }
        if(!outcome) {
            workers.processCheckOutcome(check_data, result);
            outcome = true;
        }
    })
    //bind to the error
    req.on('timeout', function(err){
        //update the checkoutcome and pass the data along
        result.error = {
            'error' : true,
            value : 'timeout'
        }
        if(!outcome) {
            workers.processCheckOutcome(check_data, result);
            outcome = true;
        }
    })

    req.end();

}

workers.processCheckOutcome = function(check_data, check_outcome) {
    //check state
    const state = !check_outcome.error && check_outcome.response_code && check_data.success_code.indexOf(check_outcome.response_code) >= 0 ? 'up' : 'down';


    //check if alert is warranted
    const alert_warranted = check_data.last_check && check_data.state !== state ? true : false;   
   
    var time_of_check = Date.now();
    workers.log(check_data, check_outcome, state, alert_warranted, time_of_check);
       
   //update check_data
   const new_check_data = check_data;
   new_check_data.state = state;
   new_check_data.last_check = Date.now();

   //update
   _data.update('checks', new_check_data.id, new_check_data, function(err){
       if(!err) {
           if(alert_warranted) {
                workers.alertUsersToChange(new_check_data);
           } else {
                console.log('No changes, wont be alerted')
           }           
       } else {
           console.log('cant update checks')
       }
   })
}
workers.alertUsersToChange = function(check_data) {
    const msg = 'Alert: Your check for '+ check_data.method.toUpperCase() + ' '+ check_data.protocol + '://'+check_data.url +' is currently '+ check_data.state;
    
    helper.sendTwillioSms(check_data.user_phone, msg, function(err){
        if(!err) {
            console.log('success! user was alerted!', msg);
        } else {
            console.log('fail to send message!', msg);
        }
    })
}
workers.init = function() {
    //execute all the checks immediately
    workers.gatherAllChecks();
    //call the loop so the checks will execute later on
    workers.loop();

    //compress logs
    workers.rotateLogs();

    //call the compression loop so logs will be compressed later on
    workers.logRotationLoop();

}

module.exports = workers;