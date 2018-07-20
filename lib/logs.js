//dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

lib.base_dir = path.join(__dirname, '/../.logs/');

lib.append = function(file, str, callback) {
    //open file for appending

    fs.open(lib.base_dir+file+'.log', 'a', function(err, file_descriptor) {
        if(!err && file_descriptor) {
            fs.appendFile(file_descriptor,str+'\n', function(err){
                if(!err) {
                    fs.close(file_descriptor, function(err){
                        if(!err){
                            callback(false)
                        } else {
                            callback('Error closing file that was being appended.')
                        }
                    })
                } else {
                    callback('Could not append string', str);         
                }
            })
        } else {
            callback('Could not open file for appending');
        }
    })
}
lib.list = function(include_compressed, callback){
    fs.readdir(lib.base_dir, function(err, data){
        if(!err && data) {
            const trimmed_filenames = [];
            data.forEach(function(filename){
                if(filename.indexOf('.log') >= 0) {
                    trimmed_filenames.push(filename.replace('.log', ''))
                }

                //add on the .gz files
                if(filename.indexOf('.gz.b64') >= 0 && include_compressed) {
                    trimmed_filenames.push(filename.replace('.gz.b64', ''));
                }

                callback(false, trimmed_filenames);
            })
        } else {
            callback(err, data);
        }
    })
}

//compress the contents of one .log file 
lib.compress = function(log_id,new_file, callback){
    const source = log_id +'.log';
    var dest_file = new_file + '.gz.b64';

    fs.readFile(lib.base_dir+source, 'utf8', function(err, input_str) {
        if(!err && input_str) {
            zlib.gzip(input_str, function(err, buffer){
                if(!err && buffer) {
                    //send data to the dest file
                    fs.open(lib.base_dir+dest_file, 'wx', function(err, file_descriptor){
                        if(!err && file_descriptor){
                            //write
                            fs.writeFile(file_descriptor, buffer.toString('base64'), function(err){
                                if(!err) {
                                    fs.close(file_descriptor, function(err){
                                        if(!err) {
                                            callback(false);
                                        } else {
                                            callback(err)
                                        }
                                    })
                                } else {
                                    callback(err);
                                }
                            })
                        } else {
                            callback(err)
                        }
                    })
                } else{
                    callback(err)
                }
            })
        }
    })
}

lib.decompress = function(file, callback) {
    
}
lib.truncate = function(type, callback){
    
}

//export module
module.exports = lib;