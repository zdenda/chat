#!/bin/env node

var restify = require('restify');
var mongojs = require('mongojs');

var ipAddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8880;
var dbUrl = process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://admin:password@localhost:27017/chat';

var db = mongojs(dbUrl, ['messages']);

var server = restify.createServer();
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.pre(function forceHttps(req, res, next) {
  if (ipAddress != '127.0.0.1' && req.headers['x-forwarded-proto'] == 'http') {
      res.redirect('https://' + req.headers.host + req.url, next);
  } else {
      return next();
  }
});


server.get('/', restify.serveStatic({
  directory: __dirname,
  file: 'index.html'
}));

server.get('/echo/:name', function (req, res, next) {
  res.send(req.params);
  return next();
});


server.listen(port, ipAddress, function() {
  console.log('%s: Node server started on %s:%d ...', Date(Date.now()),
    ipAddress, port);
});


