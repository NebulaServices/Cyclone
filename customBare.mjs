import fetch from 'node-fetch';
import { URL } from 'url';
import fs from 'fs';
import * as csstree from 'css-tree';
import * as ws from 'ws';
import filter from './filter.mjs';
import * as hammerhead from 'esotope-hammerhead';
import * as meriyah from 'meriyah';

const config = {
  prefix: "/service",
  requireSSL: true, // Requires SSL?
  defaultHeaders: {
    'X-Content-Type-Options': 'no-sniff',
  },
  furryMode: true,
}

if (config.requireSSL) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
} else {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}


class JavascriptRewriter {
  getBinaryArguments(expression) {
    var left = expression.left;
    var right = expression.right;
    var args = [];
    var lC = 0;
    while (true) {
      var leftExpr = "expression" + ".left".repeat(lC);
      try {
        var evalutation = evaluate(`var expression = ${JSON.stringify(expression)}; return ${leftExpr};`);
      } catch {
        break;
      }
      if (evalutation) {
        if (evalutation.type == "BinaryExpression") {
          var recursion = this.getBinaryArguments(evalutation.right);
          recursion.forEach(cr => {
            args.push(cr);
          })
        } else {
          args.push({
            exp: evalutation,
            expString: leftExpr.replace("expression", ""),
            count: lC
          });
        }
      }
      lC++;
    }
    var lC = 0;
    while (true) {
      var leftExpr = "expression" + ".right".repeat(lC);
      try {
        var evalutation = evaluate(`var expression = ${JSON.stringify(expression)}; return ${leftExpr};`);
      } catch {
        break;
      }
      if (evalutation) {
        if (evalutation.type == "BinaryExpression") {

        } else {
          args.push({
            exp: evalutation,
            expString: leftExpr.replace("expression", ""),
            count: lC
          });
        }
      }
      lC++;
    }

    return args;
  }

  rewriteCall(expression) {
    var args = expression.arguments || [expression.object];

    var argCount = 0;
    args.forEach(arg => {
      try {
        if (arg.object) {
          try {
            var objName = arg.object.name;
          } catch {
            // nothing :/
          }

          if (arg.object.type == "BinaryExpression") {
            this.rewriteBinary();
          }
          if (expression.arguments[argCount].object.name == 'location') {
            expression.arguments[argCount].object.name = '_location';
          } else if (!objName) {
            if (arg.object.property) {
              var objProp = (arg.object.property.name);
            } else {
              var objProp = arg.property;
            }
            if (objProp == "location") {
              expression.arguments[argCount].object.property.name = "_location";
            }
          } else if (expression.arguments[argCount].object.name == 'document') {
            if (expression.arguments[argCount].property.name == "location") {
              expression.arguments[argCount].property.name = "_location";
            }
          }
        }
      } catch {
        // what to do...
      }

      //console.log("Argument",argCount,".",expression.arguments[argCount]);
      argCount++;
    });
  }

  constructor(rewriter) {
    this.config = rewriter;
  }

  walkJS(script) {
    var ast = meriyah.parseScript(script);
    this.ast = meriyah.parseScript(script);
    return ast
  }

  rewriteBinary(ast, state, stateCount, dec, decCount) {
    if (state.type == "VariableExpression") {
      var init = dec.init;
      var args = this.getBinaryArguments(init);

      args.forEach(arg => {
        var arj = arg.exp;
        if (arj.type == "MemberExpression") {
          var obj = arj.object;
          if (obj.name == "location") {
            var evalResult = evaluate(`var state=${JSON.stringify(state)} ;try { return state.declarations[${decCount}].init${arg.expString} } catch (E) { return new Error(E); };`);
            console.log(evalResult);
            if (evalResult.object.name == "location")
              var stateRep = evaluate(`var state=${JSON.stringify(state)} ;try { state.declarations[${decCount}].init${arg.expString}.object.name="_location" } catch (E) { return "state.declarations[${decCount}].init${arg.expString}" }; return state;`);
            ast.body[stateCount] = stateRep;
          }
        }
        argCount++;
      });
    } else if (state.type == "ReturnStatement") {
      var stateArgs = state.argument;
      var args = this.getBinaryArguments(stateArgs);

      var argCount = 0;
      args.forEach(arg => {
        var exp = arg.exp;
        var expString = arg.expString;
        var expCount = arg.count;

        if (exp.type == "MemberExpression") {
          if (exp.object.name == "location") {
            var stateRep = evaluate(`var state=${JSON.stringify(state)} ;try { state.argument${arg.expString}.object.name="_location" } catch (E) { return "state.declarations[${decCount}].init${arg.expString}" }; return state;`);
            ast[stateCount] = stateRep;
          }
        }

        argCount++;
      });
    }
  }

  rewriteJS(walk) {
    var ast = walk || this.ast;
    var body = ast.body || ast;

    var stateCount = 0;
    body.forEach(state => {
      var ty = state.type;
      if (ty == 'ExpressionStatement') {
        var expression = state.expression;
        if (expression.type == 'MemberExpression') {
          var parent = expression.object.name;
          if (parent == "document") {
            if (expression.object.property.name == 'location') {
              state.expression.object.property.name = '_location';
            }
          } else {
            var ty2 = expression.object.type;
            if (ty2 == 'Identifier') {
              if (expression.object.name == 'location') {
                state.expression.object.name = '_location';
              }
            }
          }
        }
        else if (expression.type == 'AssignmentExpression') {
          if (expression.left) {
            if (expression.left.object.name == 'location') {
              state.expression.left.object.name = '_location';
            }
          } else {

          }
        }
        else if (expression.type == "CallExpression") {
          this.rewriteCall(expression);
        }
        else if (expression.type == "ImportExpression") {
          state.expression.source.value = "/service/google.com" + state.expression.source.value;
        }

      } else if (ty == "VariableDeclaration") {
        var decs = state.declarations;
        var decCount = 0;
        decs.forEach(dec => {
          this.rewriteBinary(ast, state, stateCount, dec, decCount);
          decCount++;
        });
      } else if (ty == "FunctionDeclaration") {
        var FuncBody = state.body.body;
        this.rewriteJS(FuncBody);
      } else if (ty == "ReturnStatement") {
        var arg = state.argument;
        if (arg.type == "MemberExpression") {
          if (arg.object.name == "location") {
            state.argument.object.name = "_location";
          }
        } else if (arg.type == "BinaryExpression") {
          this.rewriteBinary(ast, state, stateCount);
        }
      }
      stateCount++;
    });

    this.ast = ast;
  }

  outputRewritten() {
    return hammerhead.generate(this.ast);
  }
}


function rewriteJavascript(script, rewrite) {
  var javascript = js.replace(/"[^"]*"|(\b(?<=(?<!\.)(document\.|window\.|))location\b)/g, "_location");

  return javascript;
}

function getUrlObjs(string) {
  var regExp = /url\((?:\\["\\]|[^\n"\\])*\)/g;
  return [...string.matchAll(regExp)];
}

function rewriteCSS(css, rewriter) {
  var objs = getUrlObjs(css);
  objs.forEach(x => {
    var cssValue = x[0];
    var regExp = /\((?:\\["\\]|[^\n"\\])*\)/g;
    var uriWP = cssValue.match(regExp)[0];
    var url = uriWP.substring(1, uriWP.length - 1);

    css = css.replace(url, rewriter(url));
  })

  return css;
}

function insertScript(html) {
  var res = `<!DOCTYPE html>
<html>
<head>
<script src="/js/cryptojs.min.js"></script>
<script src="/cyclone/cyclone.js"></script>
</head>
<body>
${html}
</body>
</html>`
  return res;
}

async function fetchBare(url, res, req) {
  var server = 'https://sussyamongus.net';
  
    var options = {
      method: req.method,
      headers: {
        "Refer": url.href,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36",
        "cookies": req.cookies,
      },
    }

    try {
      var request = await fetch(url.href, options);
    } catch (e) {
      var request = {
        text() {
          return 'Error: '+e;
        },
      }
    }

    function rewrite(link) {
      var rewritten;
      try {
        if (link.startsWith('https://') || link.startsWith('http://') || link.startsWith('//')) {
          if (link.startsWith('//')) {
            rewritten = 'https:' + link;
          } else {
            rewritten = link;
          };
        } else {
          if (link.startsWith('.')) {
            let offset = 1;
            if (link.startsWith('..')) {
              offset = 2;
            }
            let file = link.substr(link.indexOf('.') + 1 + offset, link.length)
  
            rewritten = url.origin + file
          } else {
            if (link.startsWith('/')) {
              rewritten = url.host + link
            } else {
              rewritten = url.host + '/' + link;
            }
          }
        }
      } catch {
        rewritten = url.origin + '/' + link;
      }
  
      if (!link) {
        return false;
      }
  
      var exceptions = ['about:', 'mailto:', 'javascript:', 'data:']
      let needstowrite = true;
      for (let i = 0; i < exceptions.length; i++) {
        if (link.startsWith(exceptions[i])) {
          needstowrite = false
        }
      }
  
      if (needstowrite) {
        rewritten = server+'/service' + '/' + rewritten
        return (rewritten);
      } else {
        return link;
      }
    }

    if (!request) return false;
    
    try {
      var contentType = request.headers.get('content-type') || 'application/javascript'
    } catch {
      var contentType = 'application/javascript';
    }

    if (url.href.endsWith('.js')||url.href.endsWith(".js")) contentType = "application/javascript";
    if (url.href.endsWith('.css')||url.href.endsWith(".css")) contentType = "text/css";
    
    var output = null;

    if (contentType.includes('html') || contentType.includes('javascript') || contentType.includes('css')) {
      var doc = await request.text();
    }

    // Header Stuff

    res.setHeader('content-type', contentType);
    if (!request.headers) return false;
    if (request.headers.get("Location"))
      res.setHeader('Location', url.href);

    if (contentType.includes('html')) {
      output = insertScript(doc);
      res.write(output || ( `Cyclone tried to load a file but couldn't on the url: ${url.href}`));
      res.end();
    } else if (contentType.includes('javascript')) {
      output = rewriteJavascript(doc);
      res.write(output || `console.log("Cyclone tried to load a file but couldn't on the url: ${url.href}");`);
      res.end()
    } else if (contentType.includes(`css`)) {
      output = rewriteCSS(doc, rewrite);
      res.write(output || (`Cyclone tried to load a file but couldn't on the url: ${url.href}`));
      res.end();
    } else {
      request.body.pipe(res)
    }
}

function websocketIntercept(req,res) {
  console.log(req);
}

function route(req, res) {
  var path = req.url;

  if (path.startsWith(config.prefix + "/")) {
    var decoded = path.split(config.prefix + "/")[1];
    
    try {
      var url = new URL(decoded);
    } catch {
      var url = new URL("https://"+decoded);
    }
    
    if (filter(req,res)) return;

    fetchBare(url, res,req);

  } else if (path.startsWith("/encode/")) {
    var url = path.split(config.prefix + "/")[1];
    
  } else if (path.startsWith("/decode/")) {
    
  } else {
    return false;
  }
}

function isBare(req, res) {
  return (req.url.startsWith(config.prefix));
}

function routeSocket(req, socket) {
  var path = req.url;

  try {
    var url = new URL(path(config.prefix + "/")[1])
  } catch {
    var url = new URL("wss://" + path(config.prefix + "/")[1])
  }

  console.log(url);
}

export {
  route,
  routeSocket,
  isBare,
}
