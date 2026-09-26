/**
 * Rising Edge Technologies — Certificate API Client
 * /Certificate/js/certificate-api.js
 *
 * Wraps all REST API calls. Returns Promises.
 * Configure BASE_URL to point to your backend.
 */
'use strict';

var CertAPI = (function () {
  var BASE_URL = '/api/v1/certificates';
  var _token = null;

  /* ── Auth ──────────────────────────────────────────────────────── */
  function setToken(t) {
    _token = t;
  }
  function getToken() {
    if (_token) return _token;
    try {
      var s = JSON.parse(localStorage.getItem('re_session') || 'null');
      if (s && (s.accessToken || s.token)) return s.accessToken || s.token;
      var u = JSON.parse(localStorage.getItem('re_user') || 'null');
      return u && u.token ? u.token : null;
    } catch (e) {
      return null;
    }
  }

  function _headers() {
    var h = { 'Content-Type': 'application/json' };
    var tok = getToken();
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    return h;
  }

  function _req(method, path, body) {
    var opts = { method: method, headers: _headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(BASE_URL + path, opts).then(function (r) {
      return r.text().then(function (text) {
        var data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          var invalid = new Error('Certificate service returned a non-JSON response.');
          invalid.status = r.status;
          invalid.code = 'NON_JSON_RESPONSE';
          throw invalid;
        }
        if (!r.ok) {
          var err = new Error(
            data.error || data.message || 'Certificate request failed (' + r.status + ').'
          );
          err.status = r.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ── Endpoints ─────────────────────────────────────────────────── */

  /**
   * POST /api/v1/certificates/generate
   * @param {Object} data - candidateName, email, courseName, courseCode, completionDate, duration, grade, instructor
   */
  function generate(data) {
    return _req('POST', '/generate', data).catch(function (err) {
      /* This repository currently has no /api/v1/certificates routes. Its
         certificate UI is designed to remain usable through local storage. */
      if (err.code === 'NON_JSON_RESPONSE' || err.status === 404 || err.status === 405) {
        return _mockGenerate(data);
      }
      throw err;
    });
  }

  /**
   * GET /api/v1/certificates/{id}
   */
  function getById(id) {
    return _req('GET', '/' + encodeURIComponent(id))
      .then(function (res) {
        return res && res.data ? res.data : res;
      })
      .catch(function () {
        return _findStored(id);
      });
  }

  /**
   * GET /api/v1/certificates/verify/{id}
   */
  function verify(id) {
    return _req('GET', '/verify/' + encodeURIComponent(id)).catch(function (err) {
      /* Same resilience as generate()/getById(): if the real endpoint is
         unreachable or misconfigured for this deployment (non-JSON body,
         404, 405), fall back to a locally-stored certificate instead of
         surfacing a raw fetch/parse error to the visitor. */
      if (err.code === 'NON_JSON_RESPONSE' || err.status === 404 || err.status === 405) {
        return _mockVerify(id);
      }
      throw err;
    });
  }

  /**
   * POST /api/v1/certificates/{id}/email
   * Resend email to registered address
   */
  function resendEmail(id) {
    return _req('POST', '/' + encodeURIComponent(id) + '/email');
  }

  /**
   * GET /api/v1/certificates/search?q=&status=&page=&limit=
   */
  function search(params) {
    var qs = Object.keys(params || {})
      .filter(function (k) {
        return params[k] !== undefined && params[k] !== '';
      })
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      })
      .join('&');
    return _req('GET', '/search' + (qs ? '?' + qs : ''));
  }

  /**
   * DELETE /api/v1/certificates/{id}
   * Revokes a certificate.
   */
  function revoke(id) {
    return _req('DELETE', '/' + encodeURIComponent(id));
  }

  /**
   * GET /api/v1/certificates  (list all, admin)
   */
  function list(params) {
    var qs = Object.keys(params || {})
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      })
      .join('&');
    return _req('GET', qs ? '?' + qs : '');
  }

  /* ── Offline / demo mode ───────────────────────────────────────── */
  /** Returns mock data when backend is unreachable (static-site demo). */
  function _mockGenerate(data) {
    var year = new Date().getFullYear();
    var code = (data.courseCode || 'RET')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    var seq = String(Math.floor(Math.random() * 900000) + 100000);
    var certId = 'RET-' + year + '-' + code + '-' + seq;
    var record = {
      success: true,
      certificateId: certId,
      certificateNumber: certId,
      candidateName: data.candidateName,
      candidateEmail: data.email,
      courseName: data.courseName,
      courseCode: data.courseCode || '',
      completionDate: data.completionDate,
      issueDate: new Date().toISOString().slice(0, 10),
      duration: data.duration || '',
      grade: data.grade || '',
      instructor: data.instructor || '',
      status: 'active',
      verificationUrl:
        (typeof window !== 'undefined'
          ? window.location.origin
          : 'https://risingedgetechnologies.com') +
        '/Certificate/verify.html?id=' +
        encodeURIComponent(certId),
      certificateUrl: '#',
      emailSent: false,
      createdAt: new Date().toISOString(),
    };
    /* Persist to localStorage for demo */
    var all = _getStored();
    all.unshift(record);
    localStorage.setItem('re_certificates', JSON.stringify(all));
    return Promise.resolve(record);
  }

  function _getStored() {
    try {
      return JSON.parse(localStorage.getItem('re_certificates') || '[]');
    } catch (e) {
      return [];
    }
  }

  function _findStored(id) {
    return (
      _getStored().find(function (c) {
        return c.certificateId === id || c.certificateNumber === id;
      }) || null
    );
  }

  function _mockList() {
    return Promise.resolve({ success: true, data: _getStored(), total: _getStored().length });
  }

  function _mockVerify(id) {
    var all = _getStored();
    var cert = all.find(function (c) {
      return c.certificateId === id || c.certificateNumber === id;
    });
    if (!cert)
      return Promise.resolve({
        success: true,
        valid: false,
        status: 'invalid',
        message: 'Certificate not found.',
      });
    return Promise.resolve({
      success: true,
      valid: cert.status === 'active',
      status: cert.status,
      certificate: cert,
    });
  }

  function _mockRevoke(id) {
    var all = _getStored();
    all = all.map(function (c) {
      if (c.certificateId === id) c.status = 'revoked';
      return c;
    });
    localStorage.setItem('re_certificates', JSON.stringify(all));
    return Promise.resolve({ success: true });
  }

  /* Auto-detect offline mode */
  var OFFLINE = location.protocol === 'file:';

  return {
    setToken: setToken,
    generate: OFFLINE ? _mockGenerate : generate,
    // exposed for unit testing
    _mockGenerate: _mockGenerate,
    _mockVerify: _mockVerify,
    _mockRevoke: _mockRevoke,
    _findStored: _findStored,
    getById: OFFLINE
      ? function (id) {
          return Promise.resolve(_findStored(id));
        }
      : getById,
    verify: OFFLINE ? _mockVerify : verify,
    resendEmail: OFFLINE
      ? function () {
          return Promise.resolve({ success: true, message: 'Demo mode: email not sent.' });
        }
      : resendEmail,
    search: OFFLINE ? _mockList : search,
    list: OFFLINE ? _mockList : list,
    revoke: OFFLINE ? _mockRevoke : revoke,
    _getStored: _getStored,
    isOffline: OFFLINE,
  };
})();

// Explicit global assignment so the module is reachable in strict-mode eval
// contexts (window.eval in jsdom) where top-level 'use strict' prevents var
// declarations from leaking to the global scope automatically.
if (typeof window !== 'undefined') window.CertAPI = CertAPI;
