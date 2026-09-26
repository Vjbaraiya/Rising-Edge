/**
 * Rising Edge Technologies — PDF Generator
 * /Certificate/js/pdf-generator.js
 *
 * Generates a print-ready A4 landscape PDF of the certificate.
 * Uses jsPDF + html2canvas (loaded from CDN on demand).
 *
 * Usage:
 *   PDFGenerator.download(certEl, filename)
 *   PDFGenerator.toBlob(certEl) → Promise<Blob>
 */
'use strict';

var PDFGenerator = (function () {
  var JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var H2C_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  function _loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error('Failed to load: ' + src));
      };
      document.head.appendChild(s);
    });
  }

  function _ensureLibs() {
    return _loadScript(H2C_CDN).then(function () {
      return _loadScript(JSPDF_CDN);
    });
  }

  /**
   * Convert the certificate element to PDF and trigger download.
   * @param {HTMLElement} certEl    - the .cert-doc element
   * @param {string}      filename  - output filename (without .pdf)
   * @returns {Promise<void>}
   */
  function download(certEl, filename) {
    return _generate(certEl).then(function (pdf) {
      pdf.save((filename || 'certificate') + '.pdf');
    });
  }

  /**
   * Convert to PDF Blob (for upload / email attachment).
   * @param {HTMLElement} certEl
   * @returns {Promise<Blob>}
   */
  function toBlob(certEl) {
    return _generate(certEl).then(function (pdf) {
      return pdf.output('blob');
    });
  }

  /**
   * Convert to base64 string.
   */
  function toBase64(certEl) {
    return _generate(certEl).then(function (pdf) {
      return pdf.output('datauristring');
    });
  }

  function _generate(certEl) {
    return _ensureLibs()
      .then(function () {
        return html2canvas(certEl, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#F8F6F0',
          logging: false,
          width: certEl.offsetWidth,
          height: certEl.offsetHeight,
        });
      })
      .then(function (canvas) {
        var imgData = canvas.toDataURL('image/png');
        /* jsPDF A4 landscape: 297mm × 210mm */
        var pdf = new window.jspdf.jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });
        var W = pdf.internal.pageSize.getWidth();
        var H = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, W, H, undefined, 'FAST');

        /* Embed metadata */
        pdf.setProperties({
          title: 'Professional Certificate — Rising Edge Technologies',
          subject: 'Course Completion Certificate',
          author: 'Rising Edge Technologies',
          keywords: 'certificate, electronics, hardware, training',
          creator: 'Rising Edge Certificate System v1.0',
        });
        return pdf;
      });
  }

  return { download: download, toBlob: toBlob, toBase64: toBase64 };
})();
