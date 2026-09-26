/**
 * Rising Edge Technologies — Certificate Renderer
 * /Certificate/js/certificate-renderer.js
 *
 * Populates all {{placeholders}} in the certificate template,
 * renders it into a DOM element, and provides PNG/PDF export hooks.
 */
'use strict';

var CertRenderer = (function () {
  /* ── Placeholder substitution ──────────────────────────────────── */
  function _fill(html, data) {
    return html.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return data[key] !== undefined && data[key] !== null ? _esc(String(data[key])) : '';
    });
  }
  function _esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Generate a unique certificate number.
   * Format: RET-{YEAR}-{CODE}-{SEQ6}
   */
  function generateCertNumber(courseCode) {
    var year = new Date().getFullYear();
    var code = (courseCode || 'RET')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    var seq = String(Math.floor(Math.random() * 900000) + 100000);
    return 'RET-' + year + '-' + code + '-' + seq;
  }

  /**
   * Format a date string to "DD Month YYYY"
   */
  function _fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /**
   * Render the certificate template into a container element.
   *
   * @param {HTMLElement} container  - DOM node to render into
   * @param {Object}      data       - certificate data object
   * @param {string}      [tmplHtml] - template HTML (fetched if not provided)
   * @returns {Promise<HTMLElement>} - resolves with the populated element
   */
  function renderInto(container, data, tmplHtml) {
    /* Build enriched data */
    var d = Object.assign({}, data);
    d.certificateNumber = d.certificateNumber || generateCertNumber(d.courseCode);
    d.issueDate = _fmtDate(d.issueDate || d.completionDate || new Date().toISOString());
    d.completionDate = _fmtDate(d.completionDate);
    d.verificationUrl =
      d.verificationUrl ||
      (typeof window !== 'undefined'
        ? window.location.origin
        : 'https://risingedgetechnologies.com') +
        '/Certificate/verify.html?id=' +
        encodeURIComponent(d.certificateNumber);
    d.instructor = d.instructor || 'Rising Edge Technologies';
    d.grade = d.grade || '';
    d.duration = d.duration || '';
    d.batch = d.batch || '';
    d.enrollmentId = d.enrollmentId || '';
    d.courseCode = d.courseCode || '';

    function _doRender(html) {
      var filled = _fill(html, d);
      container.innerHTML = filled;
      /* Inject QR code into .cert-qr-box */
      var qrEl = container.querySelector('.cert-qr-box');
      if (qrEl && typeof QRGenerator !== 'undefined') {
        QRGenerator.renderInto(qrEl, d.verificationUrl, 64);
      }
      /* Trigger animations */
      container.querySelectorAll('.cert-doc').forEach(function (el) {
        el.style.opacity = '0';
        requestAnimationFrame(function () {
          el.style.transition = 'opacity .4s ease';
          el.style.opacity = '1';
        });
      });
      return container;
    }

    if (tmplHtml) {
      return Promise.resolve(_doRender(tmplHtml));
    }
    /* Anchor to the current Certificate page. Injected template URLs are also
       resolved against the page, not against the fetched template file. */
    var tmplPath = new URL('templates/certificate-template.html', document.baseURI).href;
    return fetch(tmplPath)
      .then(function (r) {
        if (!r.ok) throw new Error('Template not found');
        return r.text();
      })
      .then(function (html) {
        return _doRender(html);
      });
  }

  /**
   * Capture the certificate element as a PNG data URL.
   * Requires html2canvas (loaded from CDN if needed).
   * @param {HTMLElement} certEl  - the .cert-doc element
   * @returns {Promise<string>}
   */
  function toPNG(certEl) {
    return _ensureHtml2Canvas()
      .then(function () {
        return html2canvas(certEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#F8F6F0',
          logging: false,
        });
      })
      .then(function (canvas) {
        return canvas.toDataURL('image/png');
      });
  }

  /**
   * Trigger a browser print of the certificate (opens print dialog).
   * @param {HTMLElement} certEl
   */
  function printCert(certEl) {
    var win = window.open('', '_blank', 'width=1200,height=900');
    win.document.write(
      '<!DOCTYPE html><html><head>' +
        '<title>Certificate — Rising Edge Technologies</title>' +
        '<link rel="stylesheet" href="' +
        (typeof rootPath === 'function' ? rootPath() : '../') +
        'assets/css/main.css"/>' +
        '<link rel="stylesheet" href="' +
        (typeof rootPath === 'function' ? rootPath() : '') +
        'Certificate/css/certificate.css"/>' +
        '<style>body{margin:0;background:#fff}@page{size:A4 landscape;margin:0}</style>' +
        '</head><body>' +
        certEl.outerHTML +
        '<script>window.onload=function(){window.print();window.close();}<\/script>' +
        '</body></html>'
    );
    win.document.close();
  }

  function _ensureHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error('html2canvas failed to load'));
      };
      document.head.appendChild(s);
    });
  }

  return {
    renderInto: renderInto,
    toPNG: toPNG,
    printCert: printCert,
    generateCertNumber: generateCertNumber,
    // exposed for unit testing
    _fill: _fill,
    _esc: _esc,
    _fmtDate: _fmtDate,
  };
})();

// Explicit global assignment so the module is reachable in strict-mode eval
// contexts (window.eval in jsdom) where top-level 'use strict' prevents var
// declarations from leaking to the global scope automatically.
if (typeof window !== 'undefined') window.CertRenderer = CertRenderer;
