const config = {

}

class Cyclone {
  constructor() {
    this.tmp = location.pathname.split('/service')[1]

    this.tmp = this.tmp.substring(1, this.tmp.length);
    this.tmp = this.tmp.replace("http://", '')
    this.tmp = this.tmp.replace("https://", '')
    this.tmp = this.tmp.replace("http:/", '')
    this.tmp = this.tmp.replace("https:/", '')

    this.tmp = location.protocol + "//" + this.tmp
    this.tmp = new URL(this.tmp);

    this.tmp.replace = (u) => {
      location.replace(this.rewriteUrl(u));
    }

    document._location = this.tmp;

    this.url = new URL(document._location.href);

    this.prefix = location.pathname.split('/')[1]
    this.bareEndpoint = location.host + "/" + this.prefix

    if (this.url.pathname == "/") {
      this.paths = ['/']
    } else {
      this.paths = this.url.pathname.split('/')
    }

    this.host = this.url.host;

    this.targetAttrs = ['href', 'src', 'action', 'srcdoc', 'srcset'];

    /*const LocationHandler = {
      get(target, prop, reciver) {
        return loc[prop]
      },
      set(target, prop, val) {
        return 'hi'
      }
    }
    document._location = new Proxy(LocationHandler, loc)*/
  }

  rewriteUrl(link) {
    if (!link) {
      link = "";
    }

    var rewritten;

    try {
      var protocol = new URL(link).protocol
    } catch {
      var protocol = 'https:';
    }

    if (link.startsWith('https://') || link.startsWith('http://') || link.startsWith('//') || link.startsWith('wss://') || link.startsWith('ws://')) {
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

        rewritten = this.url.hostname + '/' + file;
      } else {
        if (link.startsWith('/') || link.startsWith("/")) {
          rewritten = protocol + "//" + this.host + link;
        } else {
          rewritten = protocol + "//" + this.host + '/' + link;
        }
      }
    }

    var exceptions = ['about:', 'mailto:', 'javascript:', 'data:']
    let needstowrite = true;
    for (let i = 0; i < exceptions.length; i++) {
      if (link.startsWith(exceptions[i])) {
        needstowrite = false
      }
    }


    if (needstowrite) {
      rewritten = protocol + '//' + this.bareEndpoint + '/' + rewritten
      return rewritten;
    } else {
      if (link.startsWith('javascript:')) {
        var jsR = new JavaScriptRewriter();
        let js = jsR.rewriteJavascript(link);
        return js;
      } else {
        return link;
      }
    }
  }

  rewriteSrcset(sample) {
    return sample.split(',').map(e => {
      return (e.split(' ').map(a => {
        if (a.startsWith('http') || (a.startsWith('/') && !a.startsWith(this.prefix))) {
          var url = this.rewriteUrl(url);
        }
        return a.replace(a, (url || a))
      }).join(' '))
    }).join(',')
  }
}

// Rewriting of data types

// CSS
class CSSRewriter extends Cyclone {
  constructor(proxy) {
    super()
    this.proxy = proxy;
  }

  getElementStyleText(element) {
    /*
    var styleSheet = document.styleSheets[1];

    for (var i = 0; i < styleSheet.rules.length; i++) {
      var rule = styleSheet.rules[i];

      //Different selectors
      var id = "#" + element.id
      if (id == "#") {
        id = null;
      }
      var className = "." + element.className
      if (className == ".") {
        className = null;
      }
      var nodeType = element.nodeType;

      var elementSelector = {
        'id': id,
        'class': className,
        'element': nodeType,
      }

      var selectorText = styleSheet.rules[i].selectorText;

      for (var i = 0; i < Object.keys(elementSelector); i++) {
        var key = Object.keys(elementSelector)[i];
        var dat = elementSelector[key];

        if (selectorText == dat) {
          return 
        }
      }
    }
    */

    return element.style;
  }

  rewrite(data, context) {
    const cont = context;
    try { try { cont.Url = new URL(ctx.context.url.replace(ctx.prefix, '')) } catch { cont.Url = new URL(ctx.rewriteUrl(ctx.context.url.replace(ctx.prefix, ''))) } } catch { return data }
    return data.replace(/url\("(.*?)"\)/gi, str => { var url = str.replace(/url\("(.*?)"\)/gi, '$1'); return `url("${context.rewriteUrl(url)}")`; }).replace(/url\('(.*?)'\)/gi, str => { var url = str.replace(/url\('(.*?)'\)/gi, '$1'); return `url('${context.rewriteUrl(url)}')`; }).replace(/url\((.*?)\)/gi, str => { var url = str.replace(/url\((.*?)\)/gi, '$1'); if (url.startsWith(`"`) || url.startsWith(`'`)) return str; return `url("${context.rewriteUrl(url)}")`; }).replace(/@import (.*?)"(.*?)";/gi, str => { var url = str.replace(/@import (.*?)"(.*?)";/, '$2'); return `@import "${context.rewriteUrl(url)}";` }).replace(/@import (.*?)'(.*?)';/gi, str => { var url = str.replace(/@import (.*?)'(.*?)';/, '$2'); return `@import '${context.rewriteUrl(url)}';` })
  }
} // thanks to Rhodium by EnderKingJ for this script :D 

// window.document.domain
Object.defineProperty(window.document, 'domain', {
  get() {
    return cyclone.url.hostname
  },
  set(val) {
    return val
  }
})

// JS

class JavaScriptRewriter extends Cyclone {
  constructor(proxy) {
    super();
    //Proxied methods
    this.setAttrCy = HTMLElement.prototype.setAttribute;
    this.getAttrCy = HTMLElement.prototype.getAttribute;
    this.proxy = proxy
  }

  rewriteJavascript(js) {
    var javascript = js.replace('window.location', 'document._dlocation')
    javascript = javascript.replace('document.location', 'document._dlocation')
    javascript = javascript.replace('location.', 'document._location.')
    return javascript
  }

  setAttribute(attr, value, mode) {
    const setAttrCy = HTMLElement.prototype.setAttribute;
    
    if (mode) {
      this.setAttrCy.call(this, attr, value);
    } else {
      var url = attr
      if (cyclone.targetAttrs.includes(attr)) {
        url = cyclone.rewriteUrl(url);
      }

      setAttrCy.call(this, attr, value);
    }
  }

  getAttribute(attrN, mode) {
    const getAttrCy = HTMLElement.prototype.getAttribute;

    if (mode) {
      return getAttrCy.call(this, attrN);
    } else {
      var val = getAttrCy.call(this, attrN);
      if (cyclone.targetAttrs.includes(attrN)) {
        val = getAttrCy.call(this, 'data-origin-'+attrN);
      }

      return val;
    }
  }
}
// (balls) 
// HTML
class HTMLRewriter extends Cyclone {
  rewriteElement(element) {
    var targetAttrs = this.targetAttrs;
    var attrs;

    try {
      attrs = [...element.attributes || {}].reduce((attrs, attribute) => {
        attrs[attribute.name] = attribute.value;
        return attrs;
      }, {});

    } catch {
      attrs = {};
    }

    var elementAttributes = [];

    for (var i = 0; i < targetAttrs.length; i++) {
      var attr = targetAttrs[i]
      var jsRewrite = new JavaScriptRewriter();

      if (attr) {
        var attrName = Object.keys(attrs)[i];
      }

      var toRewrite = true;

      var data = {
        name: attr,
        value: element.getAttribute('data-origin-' + attr, '') || element.getAttribute(attr, '')
      }

      if (element.nonce) {
        element.setAttribute('nononce', element.nonce, '')
        element.removeAttribute('nonce')
        toRewrite = false;
      }
      if (element.integrity) {
        element.setAttribute('nointegrity', element.integrity, '')
        element.removeAttribute('integrity');
        toRewrite = false;
      }

      if (element.tagName == "script") {
        if (!element.getAttribute('src', '')) {
          element.innerHTML = jsRewrite.rewriteJavascript(element.innerHTML)
          toRewrite = false;
        }
      }

      if (element.getAttribute("http-equiv")) {
        element.setAttribute('no-http-equiv', element.getAttribute('http-equiv', ''), '')
        element.removeAttribute('http-equiv');
        toRewrite = false;
      }

      if (element.tagName == "style") {
        element.setAttribute('type', 'text/css', '');
      }

      if (data.value && toRewrite) {
        elementAttributes.push(data);
      }

      // Css
      var cssParser = new CSSRewriter();
      var css = (cssParser.rewrite(cssParser.getElementStyleText(element)))
      element.stye = css;
      //45% done :D
    }

    for (var i = 0; i < elementAttributes.length; i++) {
      var attr = elementAttributes[i]
      var attrName = attr.name;
      var value = attr.value;

      var bareValue = this.rewriteUrl(value);
      if (attrName == "srcset") {
        this.rewriteSrcset(value);
      }

      element.setAttribute(attrName, bareValue);
      element.setAttribute("data-origin-" + attrName, value);
    }
  }

  rewriteDocument() {
    var docElements = document.querySelectorAll('*');
    for (var i = 0; i < docElements.length; i++) {
      var element = docElements[i];

      this.rewriteElement(element)
    }
  }

  rewriteiFrame(iframe) {
    var frameDoc = (iframe.contentDocument);

    let tags = frameDoc.querySelectorAll('*')

    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i]
      this.rewriteElement(tag)
    }
  }
}

const cyclone = new Cyclone();

const htmlRewriter = new HTMLRewriter();

const FetchIntercept = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  resource = cyclone.rewriteUrl(resource);

  const response = await FetchIntercept(resource, config);
  return response;
}

const MessageIntercept = window.postMessage;

window.postMessage = (...args) => {
  let [message, target, config] = args;
  target = cyclone.rewriteUrl(target);

  const response = MessageIntercept(message, target, config);
  return response;
}

var CWOriginal = Object.getOwnPropertyDescriptor(window.HTMLIFrameElement.prototype, 'contentWindow')

Object.defineProperty(window.HTMLIFrameElement.prototype, 'contentWindow', {
  get() {
    var iWindow = CWOriginal.get.call(this)
    htmlRewriter.rewriteiFrame(iWindow)

    return iWindow
  },
  set() {
    return false;
  }
})


const open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(...args) {
  args[1] = cyclone.rewriteUrl(args[1]);
  console.log(args);
  return open.call(this, args);
};

var oPush = window.history.pushState;
var oPlace = window.history.replaceState;

function CycloneStates(dat, unused, url) {
  var cyUrl = cyclone.rewriteUrl(url);

  oPush.call(this, dat, unused, cyUrl);
}

window.history.pushState = CycloneStates
window.history.replaceState = CycloneStates
history.pushState = CycloneStates
history.replaceState = CycloneStates

const OriginalWebsocket = window.WebSocket
const ProxiedWebSocket = function() {
  var url = cyclone.rewriteUrl(arguments[0])
  console.log(url);
  arguments[0] = "";

  const ws = new OriginalWebsocket(...arguments)
  console.log("Intercepting web socket", arguments);

  const originalAddEventListener = ws.addEventListener

  const proxiedAddEventListener = function() {
    if (arguments[0] === "message") {
      const cb = arguments[1]
      arguments[1] = function() {
        var origin = arguments[0].origin
        arguments[0].origin = cyclone.rewriteUrl(origin);
        console.log(arguments)
        return cb.apply(this, arguments)
      }
    }
    return originalAddEventListener.apply(this, arguments)
  }
  ws.addEventListener = proxiedAddEventListener

  Object.defineProperty(ws, "onmessage", {
    set(func) {
      return proxiedAddEventListener.apply(this, [
        "message",
        func,
        false
      ]);
    }
  });
  return ws;
};

window.WebSocket = ProxiedWebSocket;

const nwtb = window.open

function openNewTab(url, target, features) {
  url = cyclone.rewriteUrl(url)
  nwtb(url, target, features)
}

window.open = openNewTab;

//Service worker proxy
const swReg = navigator.serviceWorker.register;
function swProxy(arg) {
  arg = cyclone.rewriteUrl(arg);
  
  return swReg.call(this, arg)
}

navigator.serviceWorker.register = swProxy;

htmlRewriter.rewriteDocument();

let mutationE = new MutationObserver((mutationList, observer) => {
  for (const mutation of mutationList) {
    mutation.addedNodes.forEach(node => {
      var jsP = new JavaScriptRewriter(cyclone);

      // Node Methods
      Object.defineProperty(node, 'setAttribute', {
        value: jsP.setAttribute,
        writable: false
      })

      Object.defineProperty(node, 'getAttribute', {
        value: jsP.getAttribute,
        writable: false
      })
      
      htmlRewriter.rewriteElement(node);
    });
  }
}).observe(document, {
  childList: true,
  subtree: true
})

window.onload = function() {
  setInterval(function() {
    htmlRewriter.rewriteDocument();
  }, 2000)
}

//For intercepting all requests
if (!document.serviceWorkerRegistered) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register(location.origin + '/cySw.js').then(function(registration) {
        console.log('Service worker registered with scope: ', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
  document.serviceWorkerRegistered = true
}
