#!/bin/env node

var restify = require('restify');
var mongojs = require('mongojs');

var EARTH_MEAN_RADIUS = 6371008.8;// m, https://en.wikipedia.org/wiki/Earth_radius#Mean_radius

var ipAddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var dbUrl = process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://admin:password@localhost:27017/chat';

var db = mongojs(dbUrl, ['messages']);

var server = restify.createServer();
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.pre(function forceHttps(req, res, next) {
  if (req.headers['x-forwarded-proto'] === 'http' && req.url !== '/') {
      return next(new restify.BadRequestError('Use HTTPS protocol'));
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

server.get('/messages', function (req, res, next) {
    var lng = parseFloat(req.params.lng) || 0;
    var lat = parseFloat(req.params.lat) || 0;
    var radius = req.params.radius || req.params.radius_km * 1000 || 1000;

    var criteria = {
        location: {
            $geoWithin: {
                $centerSphere: [ [lng, lat], radius / EARTH_MEAN_RADIUS ]
            }
        }
    };
    
    db.messages.find(criteria, {_id: 0}).sort({date: 1}, function (err, messages) {
        if (err) return next(err);
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        messages.forEach(function(message) {
            // format
            message.lng = message.location.coordinates[0];
            message.lat = message.location.coordinates[1];
            delete(message.location);
        });
        res.end(JSON.stringify(messages));
        return next();
    });
});

server.post('/messages', function (req, res, next) {
    var message = {
      date: new Date(),
      name: req.params.name,
      text: req.params.text,
      location: {
          coordinates: [req.params.lng, req.params.lat],
          type: "Point"
      }
    };
    
    db.messages.save(message, function (err, data) {
        if (err) return next(err);
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        
        // format
        data.lng = data.location.coordinates[0];
        data.lat = data.location.coordinates[1];
        delete(data._id);
        delete(data.location);
        
        res.end(JSON.stringify(data));
        return next();
    });
});


server.listen(port, ipAddress, function() {
  console.log('%s: Node server started on %s:%d ...', Date(Date.now()),
    ipAddress, port);
});
