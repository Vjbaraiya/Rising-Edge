/**
 * Rising Edge Technologies — QR Code Generator
 * /Certificate/js/qr-generator.js
 *
 * Lightweight QR code generator using qrcodejs (loaded from CDN)
 * or falls back to a URL-encoded SVG placeholder.
 */
'use strict';

var QRGenerator = (function () {
  var _cdnLoaded = false;
  var _cdnLoading = false;
  var _callbacks = [];
  var CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  // Generate at this multiple of the requested display size, then scale the
  // result back down to fit — a QR rendered 1:1 at e.g. 64px looks soft on
  // any HiDPI screen and gets visibly blurry once the certificate is scaled
  // up (on-screen zoom, PDF export, print). Rendering at 4x and shrinking it
  // back down via CSS keeps the box the same size but noticeably sharper.
  var RENDER_SCALE = 4;

  function _loadQRLib(cb) {
    if (_cdnLoaded) {
      cb();
      return;
    }
    if (_cdnLoading) {
      _callbacks.push(cb);
      return;
    }
    _cdnLoading = true;
    _callbacks.push(cb);
    var s = document.createElement('script');
    s.src = CDN_URL;
    s.onload = function () {
      _cdnLoaded = true;
      _cdnLoading = false;
      _callbacks.forEach(function (fn) {
        fn();
      });
      _callbacks = [];
    };
    s.onerror = function () {
      _cdnLoading = false;
      _callbacks.forEach(function (fn) {
        fn(new Error('QR lib failed to load'));
      });
      _callbacks = [];
    };
    document.head.appendChild(s);
  }

  /**
   * Render a QR code into the given DOM element.
   * @param {HTMLElement} el   - container element
   * @param {string}      url  - text/URL to encode
   * @param {number}      size - pixel size (default 64)
   * @returns {Promise}
   */
  function renderInto(el, url, size) {
    size = size || 64;
    var genSize = size * RENDER_SCALE;
    return new Promise(function (resolve, reject) {
      _loadQRLib(function (err) {
        if (err || typeof QRCode === 'undefined') {
          /* Primary CDN lib didn't load (blocked/offline/CDN outage) — render
             a REAL, scannable QR via a lightweight image API instead of the
             old decorative placeholder, which looked like a QR code but
             encoded nothing and could never be scanned successfully. */
          _renderFallbackImg(el, url, size, genSize);
          resolve();
          return;
        }
        el.innerHTML = '';
        try {
          new QRCode(el, {
            text: url,
            width: genSize,
            height: genSize,
            colorDark: '#0B1F3A',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
          });
          _forceDisplaySize(el, size);
          resolve();
        } catch (e) {
          _renderFallbackImg(el, url, size, genSize);
          resolve();
        }
      });
    });
  }

  /** Pin the rendered canvas/img to the requested logical display size via
   *  inline style, regardless of the higher pixel resolution it was actually
   *  generated at — inline style beats page CSS and can't drift if a
   *  template's stylesheet changes later. */
  function _forceDisplaySize(el, size) {
    var px = size + 'px';
    var nodes = el.querySelectorAll('canvas, img');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.width = px;
      nodes[i].style.height = px;
    }
  }

  /**
   * Generate a QR code as a Data URL (PNG).
   * Returns a Promise<string>.
   */
  function toDataURL(url, size) {
    size = size || 128;
    return new Promise(function (resolve) {
      var tmp = document.createElement('div');
      tmp.style.position = 'absolute';
      tmp.style.left = '-9999px';
      document.body.appendChild(tmp);
      _loadQRLib(function (err) {
        if (err || typeof QRCode === 'undefined') {
          document.body.removeChild(tmp);
          resolve('');
          return;
        }
        var qr = new QRCode(tmp, {
          text: url,
          width: size,
          height: size,
          correctLevel: QRCode.CorrectLevel.H,
        });
        setTimeout(function () {
          var canvas = tmp.querySelector('canvas');
          var dataUrl = canvas ? canvas.toDataURL('image/png') : '';
          document.body.removeChild(tmp);
          resolve(dataUrl);
        }, 80);
      });
    });
  }

  /** Real, scannable QR via a lightweight public image API (no JS dependency,
   *  so it isn't affected by whatever blocked the qrcodejs CDN script). Falls
   *  back to the decorative placeholder only if there's no URL to encode, or
   *  if the image API itself also fails to load — built with DOM APIs rather
   *  than an HTML string so the onerror handler doesn't need any escaping. */
  function _renderFallbackImg(el, url, size, genSize) {
    genSize = genSize || size * RENDER_SCALE;
    if (!url || url === '#') {
      el.innerHTML = _fallbackSVG(url, size);
      return;
    }
    el.innerHTML = '';
    var img = document.createElement('img');
    img.src =
      'https://api.qrserver.com/v1/create-qr-code/?size=' +
      genSize +
      'x' +
      genSize +
      '&data=' +
      encodeURIComponent(url);
    img.width = size;
    img.height = size;
    img.style.width = size + 'px';
    img.style.height = size + 'px';
    img.alt = 'QR code';
    img.loading = 'lazy';
    img.onerror = function () {
      el.innerHTML = _fallbackSVG(url, size);
    };
    el.appendChild(img);
  }

  /** Decorative grid — last resort only, when there is no URL to encode or
   *  the QR image API itself is unreachable. This is NOT a real QR code and
   *  cannot be scanned; it exists purely so the layout doesn't show a broken
   *  image icon. */
  function _fallbackSVG(url, size) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="white"/>' +
      '<rect x="4"  y="4"  width="20" height="20" fill="none" stroke="#0B1F3A" stroke-width="2"/>' +
      '<rect x="9"  y="9"  width="10" height="10" fill="#0B1F3A"/>' +
      '<rect x="40" y="4"  width="20" height="20" fill="none" stroke="#0B1F3A" stroke-width="2"/>' +
      '<rect x="45" y="9"  width="10" height="10" fill="#0B1F3A"/>' +
      '<rect x="4"  y="40" width="20" height="20" fill="none" stroke="#0B1F3A" stroke-width="2"/>' +
      '<rect x="9"  y="45" width="10" height="10" fill="#0B1F3A"/>' +
      '<rect x="28" y="4"  width="4"  height="4"  fill="#0B1F3A"/>' +
      '<rect x="28" y="12" width="4"  height="4"  fill="#0B1F3A"/>' +
      '<rect x="28" y="20" width="8"  height="4"  fill="#0B1F3A"/>' +
      '<rect x="36" y="28" width="4"  height="4"  fill="#0B1F3A"/>' +
      '<rect x="28" y="36" width="12" height="4"  fill="#0B1F3A"/>' +
      '<rect x="44" y="36" width="4"  height="4"  fill="#0B1F3A"/>' +
      '<rect x="28" y="44" width="4"  height="4"  fill="#0B1F3A"/>' +
      '<rect x="36" y="52" width="4"  height="4"  fill="#0B1F3A"/>' +
      '<rect x="44" y="44" width="16" height="4"  fill="#0B1F3A"/>' +
      '<title>' +
      url +
      '</title>' +
      '</svg>'
    );
  }

  return { renderInto: renderInto, toDataURL: toDataURL };
})();
