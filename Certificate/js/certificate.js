/**
 * Rising Edge Technologies — Certificate Main Controller
 * /Certificate/js/certificate.js
 *
 * Central coordinator. Imported on all Certificate/ pages.
 * Depends on: certificate-api.js, certificate-renderer.js,
 *             qr-generator.js, pdf-generator.js, email.js
 */
'use strict';

var CertController = (function () {
  /* ── UI helpers ─────────────────────────────────────────────────── */
  function showToast(msg, type) {
    type = type || 'success';
    var colors = {
      success: 'var(--success)',
      error: 'var(--danger)',
      info: 'var(--primary-400)',
      warn: 'var(--warning)',
    };
    var el = document.createElement('div');
    el.style.cssText = [
      'position:fixed;bottom:24px;right:24px;z-index:9999',
      'background:var(--bg-card);border:1px solid var(--border)',
      'border-left:4px solid ' + (colors[type] || colors.success),
      'border-radius:var(--radius-lg)',
      'padding:14px 20px;font-size:var(--text-sm);font-weight:600',
      'color:var(--text-base);box-shadow:var(--shadow-lg)',
      'max-width:340px;animation:slideInRight .25s ease',
    ].join(';');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 3500);
  }

  function setLoading(btn, loading, originalText) {
    if (!btn) return;
    if (loading) {
      btn._origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> ' +
        (originalText || 'Processing…');
    } else {
      btn.disabled = false;
      btn.innerHTML = btn._origText || originalText || 'Submit';
    }
  }

  function formatDate(d) {
    if (!d) return '—';
    var dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function statusBadge(s) {
    var map = {
      active: '<span class="cert-status cert-status-active">Active</span>',
      revoked: '<span class="cert-status cert-status-revoked">Revoked</span>',
      expired: '<span class="cert-status cert-status-expired">Expired</span>',
      pending: '<span class="cert-status cert-status-pending">Pending</span>',
    };
    return map[s] || map.pending;
  }

  function initials(name) {
    return (name || '?')
      .split(' ')
      .map(function (w) {
        return w[0] || '';
      })
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /* ── Index page ─────────────────────────────────────────────────── */
  function initIndex() {
    var tbody = document.getElementById('cert-tbody');
    var searchEl = document.getElementById('cert-search');
    var filterBtns = document.querySelectorAll('.cert-filter-chip');
    var statTotal = document.getElementById('stat-total');
    var statActive = document.getElementById('stat-active');
    var statRevoked = document.getElementById('stat-revoked');
    var statPending = document.getElementById('stat-pending');
    var _allCerts = [];
    var _filter = 'all';

    CertAPI.list()
      .then(function (res) {
        _allCerts = res.data || res || [];
        _renderStats(_allCerts);
        _renderTable(_allCerts);
      })
      .catch(function (e) {
        if (tbody)
          tbody.innerHTML =
            '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-faint)">Could not load certificates. ' +
            (e.message || '') +
            '</td></tr>';
      });

    function _renderStats(certs) {
      var total = certs.length;
      var active = certs.filter(function (c) {
        return c.status === 'active';
      }).length;
      var revoked = certs.filter(function (c) {
        return c.status === 'revoked';
      }).length;
      var pending = certs.filter(function (c) {
        return c.status === 'pending';
      }).length;
      if (statTotal) statTotal.textContent = total;
      if (statActive) statActive.textContent = active;
      if (statRevoked) statRevoked.textContent = revoked;
      if (statPending) statPending.textContent = pending;
    }

    function _renderTable(certs) {
      if (!tbody) return;
      var q = (searchEl ? searchEl.value : '').toLowerCase();
      var filtered = certs.filter(function (c) {
        if (_filter !== 'all' && c.status !== _filter) return false;
        if (!q) return true;
        return (
          (c.candidateName || '').toLowerCase().indexOf(q) !== -1 ||
          (c.courseName || '').toLowerCase().indexOf(q) !== -1 ||
          (c.certificateNumber || c.certificateId || '').toLowerCase().indexOf(q) !== -1 ||
          (c.candidateEmail || '').toLowerCase().indexOf(q) !== -1
        );
      });
      if (!filtered.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-faint)">No certificates found.</td></tr>';
        return;
      }
      tbody.innerHTML = filtered
        .map(function (c) {
          var id = c.certificateId || c.certificateNumber || '';
          var av = '<div class="cert-avatar">' + initials(c.candidateName) + '</div>';
          return (
            '<tr>' +
            '<td><div class="cert-candidate-cell">' +
            av +
            '<div><div class="cert-name">' +
            _esc(c.candidateName || '') +
            '</div>' +
            '<div class="cert-email">' +
            _esc(c.candidateEmail || c.email || '') +
            '</div></div></div></td>' +
            '<td>' +
            _esc(c.courseName || '') +
            '</td>' +
            '<td><span class="cert-num">' +
            _esc(id) +
            '</span></td>' +
            '<td>' +
            statusBadge(c.status) +
            '</td>' +
            '<td>' +
            formatDate(c.completionDate) +
            '</td>' +
            '<td>' +
            formatDate(c.issueDate || c.createdAt) +
            '</td>' +
            '<td>' +
            '<div style="display:flex;gap:6px;align-items:center">' +
            '<a href="details.html?id=' +
            encodeURIComponent(id) +
            '" class="btn btn-ghost btn-sm" title="View details">View</a>' +
            '<a href="preview.html?id=' +
            encodeURIComponent(id) +
            '" class="btn btn-outline btn-sm" title="Preview">Preview</a>' +
            '</div>' +
            '</td>' +
            '</tr>'
          );
        })
        .join('');
    }

    if (searchEl)
      searchEl.addEventListener('input', function () {
        _renderTable(_allCerts);
      });
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        _filter = btn.dataset.filter || 'all';
        _renderTable(_allCerts);
      });
    });
  }

  /* ── Generate page ──────────────────────────────────────────────── */
  function initGenerate() {
    var form = document.getElementById('cert-gen-form');
    var preBtn = document.getElementById('btn-preview');
    var genBtn = document.getElementById('btn-generate');
    var preview = document.getElementById('inline-preview');

    function _collectData() {
      return {
        candidateName: form.candidateName.value.trim(),
        email: form.email.value.trim(),
        courseName: form.courseName.value.trim(),
        courseCode: form.courseCode.value.trim(),
        completionDate: form.completionDate.value,
        duration: form.duration.value.trim(),
        grade: form.grade.value.trim(),
        instructor: form.instructor.value.trim(),
        batch: form.batch ? form.batch.value.trim() : '',
        enrollmentId: form.enrollmentId ? form.enrollmentId.value.trim() : '',
      };
    }

    if (preBtn) {
      preBtn.addEventListener('click', function () {
        var d = _collectData();
        if (!d.candidateName || !d.courseName) {
          showToast('Fill in Candidate Name and Course Name first.', 'warn');
          return;
        }
        if (!preview) return;
        preview.style.display = 'block';
        preview.innerHTML =
          '<div class="cert-preview-scale"><div id="cert-doc-container"></div></div>';
        var container = document.getElementById('cert-doc-container');
        CertRenderer.renderInto(container, d).catch(function (e) {
          showToast('Preview failed: ' + e.message, 'error');
        });
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = _collectData();
        if (!d.candidateName) {
          showToast('Candidate name is required.', 'error');
          return;
        }
        if (!d.email) {
          showToast('Email is required.', 'error');
          return;
        }
        if (!d.courseName) {
          showToast('Course name is required.', 'error');
          return;
        }
        setLoading(genBtn, true, 'Generating…');
        CertAPI.generate(d)
          .then(function (res) {
            setLoading(genBtn, false);
            showToast(
              'Certificate generated: ' + (res.certificateId || res.certificateNumber),
              'success'
            );
            setTimeout(function () {
              window.location.href =
                'details.html?id=' + encodeURIComponent(res.certificateId || res.certificateNumber);
            }, 1000);
          })
          .catch(function (e) {
            setLoading(genBtn, false);
            showToast('Generation failed: ' + (e.message || JSON.stringify(e)), 'error');
          });
      });
    }
  }

  /* ── Preview page ───────────────────────────────────────────────── */
  function initPreview() {
    var id = new URLSearchParams(window.location.search).get('id');
    var container = document.getElementById('cert-doc-container');
    var dlBtn = document.getElementById('btn-download-pdf');
    var pngBtn = document.getElementById('btn-download-png');
    var prBtn = document.getElementById('btn-print');

    function _showLoadError(message) {
      if (!container) return;
      container.innerHTML =
        '<div style="width:1123px;height:794px;display:flex;align-items:center;justify-content:center;background:var(--bg-card)">' +
        '<div style="max-width:520px;text-align:center;color:var(--text-muted);padding:40px">' +
        '<h2 style="color:var(--text-base);margin-bottom:12px">Certificate unavailable</h2>' +
        '<p>' +
        _esc(message) +
        '</p>' +
        '<a href="index.html" class="btn btn-outline btn-sm" style="margin-top:20px">Back to Certificates</a>' +
        '</div></div>';
    }

    function _load(data) {
      if (!container) return;
      CertRenderer.renderInto(container, data).catch(function (e) {
        _showLoadError('The certificate template could not be loaded.');
        showToast('Render error: ' + e.message, 'error');
      });
    }

    if (id) {
      CertAPI.getById(id)
        .then(function (c) {
          if (!c) {
            _showLoadError('No certificate was found for ID "' + id + '".');
            showToast('Certificate not found.', 'error');
            return;
          }
          _load(c);
        })
        .catch(function () {
          _showLoadError('The certificate could not be loaded. Please try again.');
          showToast('Could not load certificate.', 'error');
        });
    } else {
      /* Check sessionStorage for form data from generate page */
      try {
        var d = JSON.parse(sessionStorage.getItem('cert_preview_data') || 'null');
        if (d) _load(d);
        else _showLoadError('No certificate ID or preview data was provided.');
      } catch (e) {
        _showLoadError('The saved preview data is invalid.');
      }
    }

    if (dlBtn) {
      dlBtn.addEventListener('click', function () {
        var certEl = container && container.querySelector('.cert-doc');
        if (!certEl) {
          showToast('Nothing to download.', 'warn');
          return;
        }
        setLoading(dlBtn, true, 'Generating PDF…');
        PDFGenerator.download(certEl, 'certificate-' + (id || 'ret'))
          .then(function () {
            setLoading(dlBtn, false);
            showToast('PDF downloaded!');
          })
          .catch(function (e) {
            setLoading(dlBtn, false);
            showToast('PDF failed: ' + e.message, 'error');
          });
      });
    }
    if (pngBtn) {
      pngBtn.addEventListener('click', function () {
        var certEl = container && container.querySelector('.cert-doc');
        if (!certEl) {
          showToast('Nothing to export.', 'warn');
          return;
        }
        setLoading(pngBtn, true, 'Exporting…');
        CertRenderer.toPNG(certEl)
          .then(function (url) {
            setLoading(pngBtn, false);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'certificate-' + (id || 'ret') + '.png';
            a.click();
            showToast('PNG exported!');
          })
          .catch(function (e) {
            setLoading(pngBtn, false);
            showToast('PNG failed: ' + e.message, 'error');
          });
      });
    }
    if (prBtn) {
      prBtn.addEventListener('click', function () {
        var certEl = container && container.querySelector('.cert-doc');
        if (certEl) CertRenderer.printCert(certEl);
      });
    }
  }

  /* ── Verify page ────────────────────────────────────────────────── */
  function initVerify() {
    var form = document.getElementById('verify-form');
    var inputEl = document.getElementById('cert-id-input');
    var resultEl = document.getElementById('verify-result');

    /* Pre-fill from URL param */
    var urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId && inputEl) {
      inputEl.value = urlId;
      _doVerify(urlId);
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        _doVerify(inputEl ? inputEl.value.trim() : '');
      });
    }

    function _doVerify(id) {
      if (!id) {
        showToast('Enter a certificate number.', 'warn');
        return;
      }
      if (resultEl)
        resultEl.innerHTML =
          '<div class="cert-verify-hero"><p style="color:var(--text-faint)">Verifying…</p></div>';
      CertAPI.verify(id)
        .then(function (res) {
          _showResult(res);
        })
        .catch(function (e) {
          if (resultEl)
            resultEl.innerHTML =
              '<div class="cert-verify-hero"><p style="color:var(--danger)">Verification error: ' +
              _esc(e.message || 'Unknown error') +
              '</p></div>';
        });
    }

    function _showResult(res) {
      if (!resultEl) return;
      var c = res.certificate || {};
      var valid = res.valid || res.status === 'active';
      var status = res.status || (valid ? 'active' : 'invalid');
      var iconColor = valid ? 'valid' : status === 'revoked' ? 'revoked' : 'invalid';
      var iconSvg = valid
        ? '<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      var title = valid
        ? 'Certificate Verified'
        : status === 'revoked'
          ? 'Certificate Revoked'
          : status === 'expired'
            ? 'Certificate Expired'
            : 'Certificate Not Found';
      var sub = valid
        ? 'This is an authentic certificate issued by Rising Edge Technologies.'
        : res.message || 'This certificate could not be verified.';

      var detailRows =
        valid && c.candidateName
          ? [
              { l: 'Candidate Name', v: c.candidateName },
              { l: 'Course', v: c.courseName },
              { l: 'Certificate No.', v: c.certificateNumber || c.certificateId, mono: true },
              { l: 'Completion Date', v: formatDate(c.completionDate) },
              { l: 'Issue Date', v: formatDate(c.issueDate || c.createdAt) },
              { l: 'Instructor', v: c.instructor },
              { l: 'Status', v: statusBadge(status) },
            ]
          : [];

      var certNum = c.certificateNumber || c.certificateId || '';
      var shareUrl =
        window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(certNum);
      var shareText =
        (c.candidateName ? c.candidateName + ' earned a certificate' : 'I earned a certificate') +
        (c.courseName ? ' — ' + c.courseName : '') +
        ' from Rising Edge Technologies! ' +
        shareUrl;
      var encShareUrl = encodeURIComponent(shareUrl);
      var encShareText = encodeURIComponent(shareText);

      resultEl.innerHTML =
        '<div class="cert-verify-hero">' +
        '<div class="cert-verify-icon ' +
        iconColor +
        '">' +
        iconSvg +
        '</div>' +
        '<h2 class="cert-verify-title">' +
        title +
        '</h2>' +
        '<p class="cert-verify-sub">' +
        _esc(sub) +
        '</p>' +
        '</div>' +
        (detailRows.length
          ? '<div class="cert-verify-card">' +
            detailRows
              .map(function (r) {
                return (
                  '<div class="cert-detail-row"><span class="cert-detail-lbl">' +
                  r.l +
                  '</span>' +
                  '<span class="cert-detail-val' +
                  (r.mono ? ' mono' : '') +
                  '">' +
                  (r.mono ? _esc(r.v || '') : r.v || '—') +
                  '</span></div>'
                );
              })
              .join('') +
            '</div>'
          : '') +
        (valid && certNum
          ? '<div style="margin-top:var(--sp-5);text-align:center">' +
            '<p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--sp-3)">Share this certificate</p>' +
            '<div style="display:flex;gap:var(--sp-3);justify-content:center;flex-wrap:wrap">' +
            '<a class="btn btn-outline btn-sm" href="https://wa.me/?text=' +
            encShareText +
            '" target="_blank" rel="noopener">🟢 WhatsApp</a>' +
            '<a class="btn btn-outline btn-sm" href="https://www.linkedin.com/sharing/share-offsite/?url=' +
            encShareUrl +
            '" target="_blank" rel="noopener">💼 LinkedIn</a>' +
            '<button class="btn btn-outline btn-sm" id="cert-share-insta" type="button">📸 Instagram</button>' +
            '<button class="btn btn-outline btn-sm" id="cert-share-copy" type="button">🔗 Copy link</button>' +
            '</div></div>'
          : '');

      if (valid && certNum) {
        var instaBtn = document.getElementById('cert-share-insta');
        var copyBtn = document.getElementById('cert-share-copy');
        if (instaBtn) {
          instaBtn.addEventListener('click', function () {
            _copyToClipboard(shareUrl, function () {
              showToast('Link copied — paste it in your Instagram story or bio');
              window.open('https://www.instagram.com/', '_blank', 'noopener');
            });
          });
        }
        if (copyBtn) {
          copyBtn.addEventListener('click', function () {
            _copyToClipboard(shareUrl, function () {
              showToast('Link copied to clipboard');
            });
          });
        }
      }
    }
  }

  function _copyToClipboard(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(cb, function () {
        _fallbackCopy(text, cb);
      });
    } else {
      _fallbackCopy(text, cb);
    }
  }
  function _fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      /* ignore */
    }
    document.body.removeChild(ta);
    cb();
  }

  /* ── Details page ───────────────────────────────────────────────── */
  function initDetails() {
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    CertAPI.getById(id)
      .then(function (c) {
        if (!c) {
          showToast('Certificate not found.', 'error');
          return;
        }
        _populateDetails(c);
      })
      .catch(function () {
        showToast('Error loading certificate.', 'error');
      });

    function _populateDetails(c) {
      var fields = {
        'det-name': c.candidateName,
        'det-email': c.candidateEmail || c.email,
        'det-course': c.courseName,
        'det-code': c.courseCode,
        'det-cert-num': c.certificateNumber || c.certificateId,
        'det-completion': formatDate(c.completionDate),
        'det-issued': formatDate(c.issueDate || c.createdAt),
        'det-instructor': c.instructor,
        'det-grade': c.grade || '—',
        'det-duration': c.duration || '—',
        'det-batch': c.batch || '—',
        'det-enroll': c.enrollmentId || '—',
        'det-status': statusBadge(c.status),
        'det-verify-url':
          '<a href="' +
          _esc(c.verificationUrl || '#') +
          '" target="_blank">' +
          _esc(c.verificationUrl || '—') +
          '</a>',
      };
      Object.keys(fields).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = fields[id] || '—';
      });

      /* Breadcrumb */
      var bc = document.getElementById('det-breadcrumb');
      if (bc) bc.textContent = c.certificateNumber || c.certificateId || id;

      /* QR */
      var qrEl = document.getElementById('det-qr');
      if (qrEl && typeof QRGenerator !== 'undefined') {
        QRGenerator.renderInto(qrEl, c.verificationUrl || '#', 96);
      }

      /* Action buttons */
      var previewBtn = document.getElementById('det-btn-preview');
      if (previewBtn)
        previewBtn.href =
          'preview.html?id=' + encodeURIComponent(c.certificateId || c.certificateNumber || '');

      var resendBtn = document.getElementById('det-btn-resend');
      if (resendBtn) {
        resendBtn.addEventListener('click', function () {
          setLoading(resendBtn, true, 'Sending…');
          CertEmail.send(c.certificateId || c.certificateNumber)
            .then(function (r) {
              setLoading(resendBtn, false);
              showToast(r.message || 'Email sent!', 'success');
            })
            .catch(function (e) {
              setLoading(resendBtn, false);
              showToast('Email failed: ' + e.message, 'error');
            });
        });
      }

      var revokeBtn = document.getElementById('det-btn-revoke');
      if (revokeBtn) {
        revokeBtn.addEventListener('click', function () {
          if (
            !confirm(
              'Revoke certificate ' +
                (c.certificateNumber || c.certificateId) +
                '? This cannot be undone.'
            )
          )
            return;
          setLoading(revokeBtn, true, 'Revoking…');
          CertAPI.revoke(c.certificateId || c.certificateNumber)
            .then(function () {
              setLoading(revokeBtn, false);
              showToast('Certificate revoked.', 'warn');
              location.reload();
            })
            .catch(function (e) {
              setLoading(revokeBtn, false);
              showToast('Error: ' + e.message, 'error');
            });
        });
      }
    }

    /* Detail tabs */
    var tabs = document.querySelectorAll('.cert-detail-tab');
    var panels = document.querySelectorAll('.cert-detail-panel');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('active');
        });
        panels.forEach(function (p) {
          p.classList.remove('active');
        });
        tab.classList.add('active');
        var panelId = tab.dataset.panel;
        var panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ── Resend page ────────────────────────────────────────────────── */
  function initResend() {
    var id = new URLSearchParams(window.location.search).get('id');
    var idEl = document.getElementById('resend-cert-id');
    if (idEl && id) idEl.textContent = id;

    var form = document.getElementById('resend-form');
    var sendBtn = document.getElementById('btn-send');

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var certId =
          id ||
          (document.getElementById('resend-cert-id-input') &&
            document.getElementById('resend-cert-id-input').value.trim());
        if (!certId) {
          showToast('Provide a certificate ID.', 'error');
          return;
        }
        setLoading(sendBtn, true, 'Sending…');
        CertEmail.send(certId)
          .then(function (r) {
            setLoading(sendBtn, false);
            showToast(r.message || 'Email sent successfully!', 'success');
            _logResend(certId, 'sent');
          })
          .catch(function (e) {
            setLoading(sendBtn, false);
            showToast('Failed: ' + e.message, 'error');
            _logResend(certId, 'failed');
          });
      });
    }

    function _logResend(certId, status) {
      var log = document.getElementById('resend-log');
      if (!log) return;
      var row = document.createElement('div');
      row.className = 'cert-audit-item';
      row.innerHTML =
        '<div class="cert-audit-dot ' +
        (status === 'sent' ? 'sent' : 'system') +
        '"></div>' +
        '<div><div class="cert-audit-event">' +
        (status === 'sent' ? 'Email sent' : 'Email failed') +
        '</div>' +
        '<div class="cert-audit-meta">' +
        certId +
        ' &nbsp;·&nbsp; ' +
        new Date().toLocaleString() +
        '</div></div>';
      log.prepend(row);
    }
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ── Auto-init based on page ────────────────────────────────────── */
  function autoInit() {
    var page = window.location.pathname.split('/').pop();
    if (page === 'index.html' || page === '' || page === 'Certificate') initIndex();
    if (page === 'generate.html') initGenerate();
    if (page === 'preview.html') initPreview();
    if (page === 'verify.html') initVerify();
    if (page === 'details.html') initDetails();
    if (page === 'resend.html') initResend();
  }

  return {
    init: autoInit,
    showToast: showToast,
    setLoading: setLoading,
    formatDate: formatDate,
    statusBadge: statusBadge,
    /* expose individual inits for manual use */
    initIndex: initIndex,
    initGenerate: initGenerate,
    initPreview: initPreview,
    initVerify: initVerify,
    initDetails: initDetails,
    initResend: initResend,
  };
})();

/* Auto-initialize when DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', CertController.init);
} else {
  CertController.init();
}
