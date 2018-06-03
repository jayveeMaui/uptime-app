
/**
 * Request handlers
 * 
 */
const _data = require('./data');
const helpers = require('./helpers');


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
        _data.read('users', phone, function(err, data){
            if(!err) {
                //remove hash password
                delete data.password;
                callback(200, data)
            } else {
                callback(404);
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
        //check if either firstname, lastname, password exists
        if(firstname, lastname, password) {
            _data.read('users',phone, function(err, data){
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
    } else {
        callback(404, {error: 'phone number is not valid'})
    }
}
handlers._users.delete = function(data, callback) {
    //delete if phone exists + user is authenticated 

    const phone = typeof(data.query_string.phone) == 'string' && data.query_string.phone.length == 10 ? data.query_string.phone : false;
    
    if(phone) {
        _data.delete('users', phone, function(err){
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

handlers.notFound = function(data, callback) {
    callback(404);
}

module.exports = handlers;