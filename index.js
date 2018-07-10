"use strict"

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const config = require('./lib/config');
const _data = require ('./lib/data');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');


helpers.sendTwillioSms('9397671211', 'hi miemie testing from twilio', function(err){
    console.log(err);
})

//instatiate http server
const httpServer = http.createServer(function(req, res){
    unifiedServer(req, res);
})

//instantiate https server
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert':fs.readFileSync('./https/cert.pem') 
}
const httpsServer = https.createServer(httpsServerOptions, function(req, res){
    unifiedServer(req, res);
})

httpServer.listen(config.http_port,function(){
    console.log('listening on port', config.http_port);
})


httpsServer.listen(config.https_port,function(){
    console.log('listening on port', config.https_port);
})

//define a request router
const router = {
    'ping' : handlers.ping,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
}

const unifiedServer = function(req, res) {   
    //get url then parse
    const my_url = url.parse(req.url, true);
    //get the path
    const path = my_url.pathname;
    const trimmed_path = path.replace(/^\/+|\/+$/g, '');
    //get the query string as an object
    const query_string = my_url.query;
    // get the http method
    const method = req.method.toLowerCase();
    //get the headers as an object
    const headers = req.headers;
    //get the payload if there's any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', function(data){
        buffer += decoder.write(data);
    });

    req.on('end', function(){
        buffer += decoder.end();

        //router select
        const choosenHandler = typeof(router[trimmed_path]) !== 'undefined' ? router[trimmed_path] : handlers['notFound'];
        const data = {
            trimmed_path : trimmed_path,
            query_string : query_string,
            method : method,
            headers : headers,
            payload : helpers.parseJsonToObject(buffer)
        }

        choosenHandler(data, function(statusCode, payload){
            //check status code
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            //check the payload
            payload = typeof(payload) == 'object' ? payload : {};

            //convert the payload to string
            const payload_string = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode);
            res.end(payload_string);

            console.log('returning this: ', statusCode, payload)
        })
    })
}