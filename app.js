
/**
 * Module dependencies.
 */
var express = require('express'),
    connect = require('connect'),
    cradle = require('cradle');

var app = module.exports = express.createServer();

// Setup DB
var db = new(cradle.Connection)('http://127.0.0.1', 5984, {
    cache: true, raw: false
    }).database('informationgraph');

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.staticProvider(__dirname + '/public'));
  app.use(express.logger());
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('test', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  //db = 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index.jade', {
    locals: {
              title: 'Information Graph'
            }
  });
});

// For items
app.get('/items.:format?', function(req, res){

});

app.post('/items.:format?', function(req, res){
  
});

app.get('/item/:id.:format?', function(req, res){

});

app.put('/item/:id.:format?', function(req, res){

});

app.del('/item/:id.:format?', function(req, res){

});

// For relations
app.get('/relations.:format?', function(req, res){

});

app.post('/relations.:format?', function(req, res){

});

app.get('/relation/:id.:format?', function(req, res){

});

app.put('/relation/:id.:format?', function(req, res){

});

app.del('/relation/:id.:format?', function(req, res){

});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}
