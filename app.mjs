const fs = require('fs');
const fetch = require('node-fetch');

const config = {
  prefix: "/service",
  port: null
}

function rewriteJavascript(js) {
  var javascript = js.replace('window.location', 'document._dlocation')
  javascript = javascript.replace('document.location', 'document._dlocation')
  javascript = javascript.replace('location.', 'document._location.')
  return javascript
}

function insertScript(html, origin) {
  var res = `<!DOCTYPE html>
<html>
<head>
<script preload type="module" src="/cyclone.js"></script>
</head>
<body>
${html}
</body>
</html>`
  return res
} // 

async function fetchBare(url, res, req) {
  try {
    var origin = 'https' + "://" + req.rawHeaders[1];

    var options = {
      method: req.method,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36",
        cookies: req.cookies
      },
      credentials: "same-origin"
    }

    var request = await fetch(url.href, options);
    var contentType = request.headers.get('content-type') || 'application/javascript'
    var output = null;

    if (contentType.includes('html') || contentType.includes('javascript')) {
      var doc = await request.text();
    }

    res.writeHead(200, "Sucess", {
      "content-type": contentType
    })

    if (contentType.includes('html')) {
      output = insertScript(doc, origin);
      res.write(output);
      res.end();
    } else if (contentType.includes('javascript')) {
      output = rewriteJavascript(doc)
      res.write(output);
      res.end()
    } else {
      request.body.pipe(res)
    }


  } catch (e) {
    console.log(e);

    res.end(e)
  }
}

async function route(req, res) {
  var path = req.url;

  if (path.startsWith(config.prefix + "/")) {

    try {
      var url = new URL(path.split(config.prefix + "/")[1])
    } catch {
      var url = new URL("https://" + path.split(config.prefix + "/")[1])
    }

    fetchBare(url, res, req);

  } else if (path.startsWith('/cyclone.js')) {
    var cyclone = fs.readFileSync(__dirname + '/static/cyclone.js', 'utf8');
    res.writeHead(200, "Sucess", {
      "content-type": "application/javascript"
    })
    res.write(cyclone);
    res.end();
  }
}

function isBare(req, res) {
  return (req.url.startsWith(config.prefix));
}

export {
  route,
  isBare
}
