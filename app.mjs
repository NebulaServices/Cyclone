import http from 'http';
import * as fs from 'fs';
import * as bare from './customBare.mjs';
import nodeStatic from 'node-static';
import * as analytics from '@enderkingj/analytics';

const serve = new nodeStatic.Server('./static', {
  cache: 0,
});

const __dirname = process.cwd();

const port = process.env.PORT || 5000 ;

const requestListener = function(req, res) {
  
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  if (bare.isBare(req, res)) {
    bare.route(req,res);
  } else {
    serve.serve(req, res);
  }
}

const upgradeListener = function(req, socket) {
  if (req.headers['upgrade'] !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  } else {
    if (bare.routeSocket(req, socket)) return;
    socket.end();
  }
}

const server = http.createServer();
server.on('request', requestListener);
server.on('upgrade', upgradeListener);

server.listen(port);
console.log('Cyclone is running on ', port);
