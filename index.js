var restify = require('restify'),
	Q = require('Q'),
	ChatChecker = require('./lib/ChatChecker');



var base = __dirname + (process.platform === 'win32' ? '\\' : '/');
var msgChecker = new ChatChecker(base + 'en_GB.aff', base + 'en_GB.dic')

var server = restify.createServer();
server.use(restify.queryParser());
server.get('/check', function(req, res) {
	msgChecker.checkSentence(req.query.s).then(function(corrections) {
		res.send(corrections);
	}).done();
});


server.get(/\/css\/?.*/, restify.serveStatic({
    'directory': './public/css',
    'maxAge': 0
 }));

server.get(/\/js\/?.*/, restify.serveStatic({
    'directory': './public/js',
    'maxAge': 0
 }));

server.get(/\/bower_components\/?.*/, restify.serveStatic({
    'directory': './public/bower_components',
    'maxAge': 0
 }));


server.get(/.*/, restify.serveStatic({
    'directory': './public',
    'default': 'index.html',
    'maxAge': 0
 }));


server.listen(8081, function() {
	console.log('%s listening at %s', server.name, server.url);
});
