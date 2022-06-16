import http from 'http';
import * as fs from 'fs';
import * as bare from './static/customBare.mjs';
import nodeStatic from 'node-static';

const serve = new nodeStatic.Server('./static', {
  cache: 0,
});

const __dirname = process.cwd();

const port = 8080;

const requestListener = function(req, res) {
  if (bare.isBare(req, res)) {
    bare.route(req,res);
  } else {
    serve.serve(req, res);
  }
}

const server = http.createServer(requestListener);
server.listen(port);
