/**
 * Rising Edge Technologies — Email Integration
 * /Certificate/js/email.js
 *
 * Wraps the resend/email API and assembles the email payload.
 * On the static site it runs in demo mode (logs to console).
 */
'use strict';

var CertEmail = (function () {
  /**
   * Send the certificate to the registered email address.
   * @param {string} certificateId  - e.g. RET-2026-PCB301-000451
   * @param {Object} [overrides]    - optional { to, subject, message }
   * @returns {Promise<Object>}
   */
  function send(certificateId, overrides) {
    if (typeof CertAPI === 'undefined') {
      return Promise.reject(new Error('CertAPI not loaded — include certificate-api.js first.'));
    }
    return CertAPI.resendEmail(certificateId, overrides);
  }

  /**
   * Build HTML email body string from certificate data.
   * Used for previewing or for backend injection.
   */
  function buildEmailHTML(cert) {
    var verifyUrl =
      cert.verificationUrl ||
      (typeof window !== 'undefined'
        ? window.location.origin
        : 'https://risingedgetechnologies.com') +
        '/Certificate/verify.html?id=' +
        encodeURIComponent(cert.certificateNumber);
    var downloadUrl = cert.certificateUrl || verifyUrl;

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>',
      '<title>Your Certificate — Rising Edge Technologies</title>',
      '<style>',
      'body{margin:0;padding:0;background:#f0f4f8;font-family:Inter,Helvetica,Arial,sans-serif;color:#1a202c}',
      '.wrapper{max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}',
      '.header{background:linear-gradient(135deg,#0B1F3A,#007BFF);padding:40px 40px 32px;text-align:center}',
      '.header img{height:48px;margin-bottom:16px}',
      '.header h1{margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:.04em}',
      '.header p{margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.7);letter-spacing:.15em;text-transform:uppercase}',
      '.gold-bar{height:4px;background:linear-gradient(90deg,#D4AF37,#007BFF,#D4AF37)}',
      '.body{padding:40px}',
      '.body p{margin:0 0 16px;line-height:1.7;font-size:15px;color:#4a5568}',
      '.name{font-size:26px;font-weight:800;color:#0B1F3A;text-align:center;margin:24px 0 8px}',
      '.course{font-size:15px;font-weight:600;color:#007BFF;text-align:center;margin-bottom:32px}',
      '.cert-box{background:#f8f6f0;border:2px solid #D4AF37;border-radius:10px;padding:24px 32px;margin-bottom:32px;text-align:center}',
      '.cert-box .cert-num{font-size:12px;font-family:monospace;color:#D4AF37;letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px}',
      '.cert-box .cert-title{font-size:14px;font-weight:700;color:#0B1F3A;text-transform:uppercase;letter-spacing:.08em}',
      '.btn-row{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:32px}',
      '.btn-primary{display:inline-block;background:#007BFF;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.03em}',
      '.btn-outline{display:inline-block;border:2px solid #007BFF;color:#007BFF;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}',
      '.divider{height:1px;background:#e2e8f0;margin:24px 0}',
      '.footer{background:#0B1F3A;padding:24px 40px;text-align:center}',
      '.footer p{margin:0;font-size:11px;color:rgba(255,255,255,.5);line-height:1.7}',
      '.footer a{color:#D4AF37;text-decoration:none}',
      '</style>',
      '</head>',
      '<body>',
      '<div class="wrapper">',
      '  <div class="header">',
      '    <img src="https://risingedgetechnologies.com/assets/images/RE_Logo.png" alt="Rising Edge Technologies"/>',
      '    <h1>Congratulations! 🎓</h1>',
      '    <p>Your Certificate is Ready</p>',
      '  </div>',
      '  <div class="gold-bar"></div>',
      '  <div class="body">',
      '    <p>Dear <strong>' + _esc(cert.candidateName || 'Learner') + '</strong>,</p>',
      '    <p>We are delighted to inform you that you have successfully completed the professional training program offered by <strong>Rising Edge Technologies</strong>.</p>',
      '    <div class="name">' + _esc(cert.candidateName || '') + '</div>',
      '    <div class="course">' + _esc(cert.courseName || '') + '</div>',
      '    <div class="cert-box">',
      '      <div class="cert-num">Certificate No: ' +
        _esc(cert.certificateNumber || '') +
        '</div>',
      '      <div class="cert-title">Professional Course Completion Certificate</div>',
      '      <p style="margin:8px 0 0;font-size:13px;color:#718096">Completed: ' +
        _esc(cert.completionDate || '') +
        ' &nbsp;|&nbsp; Issued: ' +
        _esc(cert.issueDate || '') +
        '</p>',
      '    </div>',
      '    <div class="btn-row">',
      '      <a href="' + downloadUrl + '" class="btn-primary">Download Certificate</a>',
      '      <a href="' + verifyUrl + '" class="btn-outline">Verify Online</a>',
      '    </div>',
      '    <div class="divider"></div>',
      '    <p style="font-size:13px;color:#718096;text-align:center">Your certificate is also attached to this email as a PDF. You can share the verification link or QR code to authenticate your achievement.</p>',
      '  </div>',
      '  <div class="footer">',
      '    <p>Rising Edge Technologies &nbsp;|&nbsp; <a href="https://risingedgetechnologies.com">risingedgetechnologies.com</a></p>',
      '    <p>If you have any questions, contact us at <a href="mailto:support@risingedgetechnologies.com">support@risingedgetechnologies.com</a></p>',
      '  </div>',
      '</div>',
      '</body></html>',
    ].join('\n');
  }

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Preview the email in a new tab.
   */
  function previewEmail(cert) {
    var html = buildEmailHTML(cert);
    var win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  }

  return { send: send, buildEmailHTML: buildEmailHTML, previewEmail: previewEmail };
})();
