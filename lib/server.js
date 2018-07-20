"use strict"

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const config = require('./config');
const _data = require ('./data');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

//instantiate the server module object
const server = {};

//instatiate http server
server.httpServer = http.createServer(function(req, res){
    server.unifiedServer(req, res);
})

//instantiate https server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    'cert':fs.readFileSync(path.join(__dirname,'/../https/cert.pem')) 
}
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res){
    server.unifiedServer(req, res);
})


//define a request router
server.router = {
    'ping' : handlers.ping,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
}

server.unifiedServer = function(req, res) {   
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
        const choosenHandler = typeof(server.router[trimmed_path]) !== 'undefined' ? server.router[trimmed_path] : handlers['notFound'];
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

server.init = function() {
    server.httpServer.listen(config.http_port,function(){
        console.log('listening on port', config.http_port);
    })
    
    
    server.httpsServer.listen(config.https_port,function(){
        console.log('listening on port', config.https_port);
    })
}

//export server
module.exports = server;