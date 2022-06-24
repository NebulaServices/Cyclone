window.NoGG = function (url, alert) {
    var urlObj = new window.URL(window.location.href);
    win = window.open();
    win.document.body.style.margin = '0';
    win.document.body.style.height = '100vh';
    var iframe = win.document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.margin = '0';
    iframe.referrerpolicy = 'no-referrer';
    iframe.allow = 'fullscreen';
    iframe.src = url;
    win.document.body.appendChild(iframe);
    window.location.replace("https://desmos.com/scientific");
}

class TabCloak {
  getCookie(cname) {
    var cookies = document.cookie.split(";");
    var v = null;

    cookies.forEach(c => {
      var c = c.trim();
      var cookie = {
        name: c.split('=')[0],
        value: c.split('=')[1]
      }
      if (cookie.name === cname) {
        v = cookie.value
      }
    })

    return v
  }
  
  constructor(tab, favicon) {
    this.cookie = this.getCookie('tabData') || "tabData=" + tab + "&" + favicon;
    document.cookie = this.cookie;
    this.title = this.cookie.split('&')[0];
    this.favicon = this.cookie.split('&')[1];

    document.title = this.title;
    document.querySelector('link[rel="shortcut icon"]').href = this.favicon
  }

  update() {
    this.cookie = this.getCookie('tabData') || "tabData=" + tab + "&" + favicon;
    document.cookie = this.cookie;
    this.title = this.cookie.split('&')[0];
    this.favicon = this.cookie.split('&')[1];

    document.title = this.title;
    document.querySelector('link[rel="shortcut icon"]').href = this.favicon
  }
}

const cloak = new TabCloak('Google Docs', 'https://docs.google.com/favicon.ico');
