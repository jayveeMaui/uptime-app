var env = {};

env.staging = {
    'http_port': 3000,
    'https_port' : 3001,
    'env_name' : 'staging',
    'hash_secret': 'secret secret',
    'max_check': 5,
    twilio : {
        account_SID: '',
        auth_token: '',
        from_phone: ''
    }
};

env.production = {
    'http_port': 5000,
    'https_port' : 5001,
    'env_name' : 'production',
    'hash_secret': 'secret secret',
    'max_check' : 5    
};
//check if NODE_ENV is specified
const cur_env = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

//check if NODE_ENV specified is correct
const env_to_export = typeof(env[cur_env]) == 'object'? env[cur_env] : env.staging;

module.exports = env_to_export;