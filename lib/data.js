/***
 * Library for storing and editing data
 * 
 */

 const fs = require('fs');
 const path = require('path');
 const helpers = require('./helpers')

 var lib = {};

lib.base_dir = path.join(__dirname,'/../.data/');

lib.create = function(dir, file, data, callback) {
    //open (create) the file for writing
    fs.open(lib.base_dir+dir+'/'+file+'.json', 'wx', function(err, file_descriptor) {
        if(!err && file_descriptor) {
            const string_data = JSON.stringify(data);

            fs.writeFile(file_descriptor, string_data, function(err){
                if(!err) {
                    fs.close(file_descriptor, function(err){
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    });
                }
            })
        } else {
            callback('Could not ecreate new file, it may already exist')
         }
    })
}

lib.read = function (dir, file, callback) {
    fs.readFile(lib.base_dir+dir+'/'+file+'.json', 'utf-8', function(err, data){
        if(!err && data)
            callback(err,helpers.parseJsonToObject(data));
        else
            callback(err, data);
    })
}

lib.update = function (dir, file, data, callback) {
    fs.open(lib.base_dir+dir+'/'+file+'.json', 'r+', function(err, file_descriptor) {
        if(!err && file_descriptor) {
            const string_data = JSON.stringify(data);
            
            fs.truncate(file_descriptor, function(err){
                if(!err) {
                    fs.write(file_descriptor, string_data, function(err) {
                        if(!err) {
                            fs.close(file_descriptor, function(err){
                                if(!err) {
                                    callback(false)
                                } else {
                                    callback('error closing the file');
                                }
                            })
                        } else {
                            callback('cant update existing file')
                        } 
                    })
                } else {
                    callback('cant truncate');
                }
            })
        } else {
            callback('could not update. it may not exist yet')
        }
    })
}

lib.delete = function(dir, file, callback) {
    fs.unlink(lib.base_dir+dir+'/'+file+'.json', function(err){
        if(!err){
            callback(false);
        } else {
            callback('trouble deleting the file');
        }
    })
}

lib.list = function(dir, callback) {
    fs.readdir(lib.base_dir+dir+'/', function(err, data){
        if(!err && data && data.length > 0) {
            const trimmed_filenames = [];
            data.forEach(function(filename){
                trimmed_filenames.push(filename.replace('.json', ''));
            })
            callback(false, trimmed_filenames);
        } else {
            callback(err, data) 
        }
    })
}

 module.exports = lib;