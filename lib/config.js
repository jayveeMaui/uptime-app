var env = {};

env.staging = {
    'http_port': 3000,
    'https_port' : 3001,
    'env_name' : 'staging',
    'hash_secret': 'secret secret',
    'max_check': 5,
    'twilio' : {
        'account_SID': 'AC5baf1d4d2c0036f5a55c3ab247b371e5',
        'auth_token': '2b08bf3f295ef93e1475d45953299d3e',
        'from_phone': '+639082613872'
    }
};

env.production = {
    'http_port': 5000,
    'https_port' : 5001,
    'env_name' : 'production',
    'hash_secret': 'secret secret',
    'max_check' : 5,
    'twilio' : {
        'account_SID': 'AC5baf1d4d2c0036f5a55c3ab247b371e5',
        'auth_token': '2b08bf3f295ef93e1475d45953299d3e',
        'from_phone': '+639082613872'
    }    
};
//check if NODE_ENV is specified
const cur_env = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

//check if NODE_ENV specified is correct
const env_to_export = typeof(env[cur_env]) == 'object'? env[cur_env] : env.staging;

module.exports = env_to_export;