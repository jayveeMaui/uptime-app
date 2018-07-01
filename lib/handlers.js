/**
 * Request handlers
 * 
 */
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');


const handlers = {}

handlers.ping = function(data, callback){
    callback(200);
}

handlers.users = function(data,callback) {
    const acceptable_methods = ['post', 'get', 'put', 'delete'];

    if(acceptable_methods.indexOf(data.method) >= -1) {
        handlers._users[data.method](data, callback);
    }
}
handlers._users = {};

handlers._users.post = function(data, callback) {
    //check that all required are filled out
    const firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    const lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tos_agreement = typeof(data.payload.tos_agreement) == 'boolean' && data.payload.tos_agreement == true ? true : false;

    if(firstname && lastname && phone && password && tos_agreement) {
        //check if user already exists
        _data.read('users', phone, function(err, data){
            if(err) {
                //hash the password 
                const hash_pass = helpers.hash(password);

                if(hash_pass) {
                    const user_object = {
                        firstname: firstname,
                        lastname: lastname,
                        phone: phone,
                        password: hash_pass,
                        tos_agreement: true
                    }
                    _data.create('users', phone, user_object, function(err){
                        if(!err) {
                            callback(200);
                        } else {
                            callback(400, {'Error': 'cant create user'})
                        }
                    })                   
                } else {
                    callback(500, {'Error': 'could not hash the user password'})
                }

 
            } else {
                callback(400, {'Error': 'user already exist'});
            }
        })            
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
}

//@todo only authenticated user access its own info
handlers._users.get = function(data, callback) {
    const phone = typeof(data.query_string.phone) == 'string' && data.query_string.phone.length == 10 ? data.query_string.phone : false;

    if(phone) {

        //get token
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;
        console.log(token);
        handlers._tokens.verify(token, phone, function(token_valid){
            if(token_valid) {
                _data.read('users', phone, function(err, data){
                    if(!err) {
                        //remove hash password
                        delete data.password;
                        callback(200, data)
                    } else {
                        callback(404);
                    }
                })        
            } else {
                callback(500, {Error: 'token is not valid'});
            }
        })


    }
}
// @todo: only authenticated user can update their own info
handlers._users.put = function(data, callback) {
    const firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    const lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    //check if phone is valid
    if(phone) {

        //get token
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;

        handlers._tokens.verify(token, phone, function(token_valid){
            if(token_valid) {
                //check if either firstname, lastname, password exists
                if(firstname, lastname, password) {
                    _data.read('users', phone, function(err, data){
                        if(!err) {
                            if(firstname)
                                data.firstname = firstname
                            if(lastname)
                                data.lastname = lastname
                            if(password)
                                data.password = helpers.hash(password)

                            //store new update, persist it to disk
                            _data.update('users', phone, data, function(err){
                                if(!err) {
                                    callback(200)
                                }
                                else {
                                    callback(500, {error: err})
                                }
                            })    
                        } 
                        else {
                            callback(404, {error: 'the user does not exists'})
                        }
                    })
                } else {
                    callback(500, {error: 'missing information'});
                }
            }  else{
                callback(500, {Error: 'Token is not valid'});
            }    
        })    
    } else {
        callback(404, {error: 'phone number is not valid'})
    }
}
handlers._users.delete = function(data, callback) {
    //delete if phone exists + user is authenticated 

    const phone = typeof(data.query_string.phone) == 'string' && data.query_string.phone.length == 10 ? data.query_string.phone : false;
    
    if(phone) {

        //get token
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;
        handlers._tokens.verify(token, phone, function(token_valid){
            if(token_valid) {        
                _data.delete('users', phone, function(err){
                    if(!err)
                        callback(200);
                    else {
                        callback(500, {error: err})
                    }
                })
            } else {
                callback(403, {Error: 'token is not valid!'})
            }
        })

    } else {
        callback(404, {error: 'user cannot be found.'})
    }
}

handlers.tokens = function(data,callback) {
    const acceptable_methods = ['post', 'get', 'put', 'delete'];

    if(acceptable_methods.indexOf(data.method) >= -1) {
        handlers._tokens[data.method](data, callback);
    }
}
handlers._tokens = {};


handlers._tokens.post = function(data, callback){
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password) {
        //check if phone exists
        _data.read('users', phone, function(err, data){
            if(!err && data) {
                const hash_pass = helpers.hash(password);

                if(data.password === hash_pass) {
                       const token_id = helpers.createRandomString(20);
                       const expire = Date.now() + 1000 * 60 * 60;
                       const token_obj = {
                           phone : phone,
                           id : token_id,
                           expire : expire
                       }

                       //create the file
                       _data.create('tokens', token_id, token_obj, function(err) {
                           if(!err) {
                                callback(200, token_obj);
                           } else {
                               callback(404, 'can\'t create the token')
                           }
                       })

                } else {
                    callback(500, 'password is invalid')
                }
            } else {

            }
        })
    } else {
        callback(404, {'Error': 'Missing required fields!'})
    }
}
handlers._tokens.get = function(data, callback){
    //check if id is ok
    const id = typeof(data.query_string.id) == 'string' && data.query_string.id.length == 20 ? data.query_string.id : false;

    if(id) {
        _data.read('tokens', id, function(err, data){
            if(!err) {
                callback(200, data)
            } else {
                callback(404);
            }
        })        
    }
}
//required : id, extend
handlers._tokens.put = function(data, callback){
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof data.payload.extend === 'boolean' &&  data.payload.extend === true ? true : false;

    if(id && extend) {
        _data.read('tokens', id, function(err, data){
            if(!err && data) {
                if(data.expire > Date.now()) {
                    data.expire = Date.now() + 1000 * 60 * 60;

                    _data.update('tokens', id, data, function(err){
                        if(!err) {
                            callback(200, data);
                        } else {
                            callback(500, {Error: 'could not update token expiration'})
                        }
                    })

                } else {
                    callback(500, {Error: 'token has been expired'})
                }
            } else {
                callback(404, {Error: 'not valid'})
            }
        })
    } else {
        callback(404, {Error: 'Missing required fields or fields are invalid!'})
    }
}
// Required: id
handlers._tokens.delete = function(data, callback){
    //delete if phone exists + user is authenticated 

    const id = typeof(data.query_string.id) == 'string' && data.query_string.id.length == 20 ? data.query_string.id : false;
    
    if(id) {
        _data.delete('tokens', id, function(err){
            if(!err)
                callback(200);
            else {
                callback(500, {error: err})
            }
        })

    } else {
        callback(404, {error: 'user cannot be found.'})
    }
}



//verify if given token is valid for current user
handlers._tokens.verify = function(id, phone, callback) {
    _data.read('tokens', id, function(err, data){
        if(!err) {
            if(data.phone === phone && data.expire > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    })
}

/** Checks endpoint */

handlers.checks = function(data,callback) {
    const acceptable_methods = ['post', 'get', 'put', 'delete'];

    if(acceptable_methods.indexOf(data.method) >= -1) {
        handlers._checks[data.method](data, callback);
    }
}
handlers._checks = {};

//Required data : protocol (https | http), Url, method, success_code, timeout
handlers._checks.post = function(data, callback) {
    const protocol = typeof data.payload.protocol === 'string' && ['https','http'].indexOf(data.payload.protocol) >=0 ? data.payload.protocol.trim() : false;
    const url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ?  data.payload.url : false;
    const method = typeof data.payload.method === 'string' && ['get','post', 'put', 'delete'].indexOf(data.payload.method) >=0  ?  data.payload.method : false;
    const success_code = typeof data.payload.success_code === 'object' && data.payload.success_code instanceof Array && data.payload.success_code.length > 0 ?  data.payload.success_code : false;
    const timeout = typeof data.payload.timeout === 'number' && data.payload.timeout % 1 === 0 && data.payload.timeout > 1 ?  data.payload.timeout : false;
     
    if(protocol && url && method && success_code && timeout) {

        //get token 
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;

        _data.read('tokens', token, function(err, token_data) {
            if(!err && token_data) {
                const user_phone = token_data.phone;

                //lookup user data 
                _data.read('users', user_phone, function(err, data){
                    if(!err && data) {
                        const user_checks = typeof data.user_checks == 'object' && data.user_checks instanceof Array ? data.user_checks : [];

                        //check if check limit reach
                        if(user_checks.length < config.max_check) {
                            //create a random Id for the check
                            const check_id = helpers.createRandomString(20);
                            const check_obj = {
                                'id': check_id,
                                'user_phone': user_phone,
                                'protocol': protocol,
                                url: url,
                                success_code: success_code,
                                method: method,
                                    
                            }
                            _data.create('checks', check_id, check_obj, function(err){
                                if(!err) {
                                    //add the check Id to users object
                                    data.user_checks = user_checks;
                                    data.user_checks.push(check_id);

                                    _data.update('users', data.phone, data, function(err){
                                        if(!err) {
                                            callback(200, check_obj);
                                        } else {
                                            callback(300, {Error: 'Could not update the user with the new check'})
                                        }
                                    })
                                    
                                } else {
                                    callback(300, {Error: 'Could not create new checks! '})
                                }
                            })
                        } else {
                            callback(400, {Error: 'Check Limit Reach! '})
                        }
                    } else {
                        callback(403, {Error: 'user could not be found!'})
                    }
                })
            } else {
                callback(403, {Error: 'Token not found/valid'})
            }
        })

    } else {
        callback(404, {Error: 'Missing required input fields!'})
    }

}

/**
 * Required: id
 */
handlers._checks.get = function(data, callback) {
    const id = typeof(data.query_string.id) == 'string' && data.query_string.id.length == 20 ? data.query_string.id : false;

    if(id) {
        //lookup the checks
        _data.read('checks', id, function(err, checks_data){
            if(!err && checks_data) {
                //get token
                const token = typeof data.headers.token === 'string' ? data.headers.token : false;
                handlers._tokens.verify(token, checks_data.user_phone, function(token_valid){
                    if(token_valid) {
                        callback(200, checks_data);
                    } else {
                        callback(403, {Error: 'token is not valid'});
                    }
                })                
            } else {
                callback(404, {Error: 'not valid checks'})
            }
        })
    }
}
// check - put
handlers._checks.put = function(data, callback) {

    const id = typeof(data.payload.id) == 'string' && data.payload.id.length == 20 ? data.payload.id : false;

    const protocol = typeof data.payload.protocol === 'string' && ['https','http'].indexOf(data.payload.protocol) >=0 ? data.payload.protocol.trim() : false;
    const url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ?  data.payload.url : false;
    const method = typeof data.payload.method === 'string' && ['get','post', 'put', 'delete'].indexOf(data.payload.method) >=0  ?  data.payload.method : false;
    const success_code = typeof data.payload.success_code === 'object' && data.payload.success_code instanceof Array && data.payload.success_code.length > 0 ?  data.payload.success_code : false;
    const timeout = typeof data.payload.timeout === 'number' && data.payload.timeout % 1 === 0 && data.payload.timeout > 1 ?  data.payload.timeout : false;
     
    //check if phone is valid
    if(id) {

        if(protocol || url || method || success_code || timeout) {
            _data.read('checks', id, function(err, checks_data){
                if(!err && checks_data) {
                    //get token
                    const token = typeof data.headers.token === 'string' ? data.headers.token : false;

                    handlers._tokens.verify(token, checks_data.user_phone, function(token_valid){
                        if(token_valid) {
                            if(protocol)
                                checks_data.protocol = protocol;
                            if(url)
                                checks_data.url = url;
                            if(method)
                                checks_data.method = method;
                            if(success_code)
                                checks_data.success_code = success_code;
                            if(timeout)
                                checks_data.timeout = timeout;
                            //store new update, persist it to disk
                            _data.update('checks', id, checks_data, function(err){
                                if(!err) {
                                    callback(200,checks_data)
                                }
                                else {
                                    callback(500, {error: err})
                                }
                            })    
                        }  else{
                            callback(500, {Error: 'Token is not valid'});
                        }    
                    })
                } else {
                    callback(404, {Error: 'check Id not found'})
                }
            })
        } else {
            callback(400, {Error: 'Missing fields to update'})
        }    
    } else {
        callback(404, {error: 'phone number is not valid'})
    }
}
handlers.notFound = function(data, callback) {
    callback(404);
}

module.exports = handlers;