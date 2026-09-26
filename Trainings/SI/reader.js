/**
 * reader.js — Read-Aloud feature for Rising Edge SI Academy lessons
 * Uses the Web Speech API (SpeechSynthesis).
 * Preferences (voice, rate) are persisted in localStorage.
 */

(function () {
  'use strict';

  if (!window.speechSynthesis) {
    // Graceful fallback: hide the reader bar
    var bar = document.getElementById('reader-bar');
    if (bar) {
      bar.innerHTML =
        '<span style="font-size:0.75rem;color:var(--text-muted)">Read aloud not supported in this browser.</span>';
    }
    return;
  }

  /* ── State ──────────────────────────────────────────────────────── */
  var synth = window.speechSynthesis;
  var elements = []; // readable DOM elements
  var currentIdx = 0;
  var isPlaying = false;
  var isPaused = false;
  var currentUtterance = null;
  var voices = [];

  /* Preferences */
  var prefRate = parseFloat(localStorage.getItem('re-reader-rate') || '1');
  var prefVoice = localStorage.getItem('re-reader-voice') || '';

  /* ── DOM refs (populated after DOMContentLoaded) ─────────────────── */
  var btnPlay, btnStop, selSpeed, selVoice;

  /* ── Readable elements selector ─────────────────────────────────── */
  function getReadableElements() {
    var body = document.querySelector('.lesson-body');
    if (!body) return [];
    return Array.from(
      body.querySelectorAll('p, h2, h3, h4, li, th, td, .callout, .alert, blockquote')
    ).filter(function (el) {
      // Skip elements inside nav, code, buttons, reader bar itself
      return (
        !el.closest('pre') &&
        !el.closest('code') &&
        !el.closest('.lesson-nav') &&
        !el.closest('button') &&
        !el.closest('#reader-bar') &&
        el.textContent.trim().length > 0
      );
    });
  }

  /* ── Highlight helpers ───────────────────────────────────────────── */
  function highlight(el) {
    clearHighlight();
    if (!el) return;
    el.classList.add('reader-active');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearHighlight() {
    document.querySelectorAll('.reader-active').forEach(function (e) {
      e.classList.remove('reader-active');
    });
  }

  /* ── UI state ────────────────────────────────────────────────────── */
  function updateUI() {
    if (!btnPlay) return;
    if (isPlaying && !isPaused) {
      btnPlay.innerHTML =
        '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
      btnPlay.classList.add('active');
    } else if (isPaused) {
      btnPlay.innerHTML =
        '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume';
      btnPlay.classList.remove('active');
    } else {
      btnPlay.innerHTML =
        '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play';
      btnPlay.classList.remove('active');
    }
    if (btnStop) btnStop.disabled = !isPlaying && !isPaused;
  }

  /* ── Core read engine ────────────────────────────────────────────── */
  function speakFrom(idx) {
    if (idx >= elements.length) {
      readerStop();
      return;
    }
    var el = elements[idx];
    var text = el.textContent.trim();
    if (!text) {
      speakFrom(idx + 1);
      return;
    }

    var utt = new SpeechSynthesisUtterance(text);
    utt.rate = prefRate;
    if (prefVoice && voices.length) {
      var v = voices.find(function (x) {
        return x.name === prefVoice;
      });
      if (v) utt.voice = v;
    }

    utt.onstart = function () {
      currentIdx = idx;
      highlight(el);
    };
    utt.onend = function () {
      el.classList.remove('reader-active');
      speakFrom(idx + 1);
    };
    utt.onerror = function () {
      el.classList.remove('reader-active');
      speakFrom(idx + 1);
    };

    currentUtterance = utt;
    synth.speak(utt);
  }

  /* ── Public controls ─────────────────────────────────────────────── */
  window.readerToggle = function () {
    if (!isPlaying && !isPaused) {
      // Fresh start
      elements = getReadableElements();
      currentIdx = 0;
      isPlaying = true;
      isPaused = false;
      synth.cancel();
      speakFrom(0);
    } else if (isPlaying && !isPaused) {
      // Pause
      synth.pause();
      isPaused = true;
      isPlaying = false;
    } else if (isPaused) {
      // Resume
      synth.resume();
      isPaused = false;
      isPlaying = true;
    }
    updateUI();
  };

  window.readerStop = function () {
    synth.cancel();
    isPlaying = false;
    isPaused = false;
    currentIdx = 0;
    clearHighlight();
    updateUI();
  };

  window.readerSetSpeed = function (val) {
    prefRate = parseFloat(val);
    localStorage.setItem('re-reader-rate', val);
    // Restart from current position if playing
    if (isPlaying || isPaused) {
      synth.cancel();
      isPlaying = true;
      isPaused = false;
      speakFrom(currentIdx);
      updateUI();
    }
  };

  window.readerSetVoice = function (val) {
    prefVoice = val;
    localStorage.setItem('re-reader-voice', val);
  };

  /* ── Voice list ──────────────────────────────────────────────────── */
  function populateVoices() {
    voices = synth.getVoices();
    if (!selVoice || !voices.length) return;
    selVoice.innerHTML = '<option value="">Default voice</option>';
    voices.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name + ' (' + v.lang + ')';
      if (v.name === prefVoice) opt.selected = true;
      selVoice.appendChild(opt);
    });
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    btnPlay = document.getElementById('reader-play-btn');
    btnStop = document.getElementById('reader-stop-btn');
    selSpeed = document.getElementById('reader-speed');
    selVoice = document.getElementById('reader-voice');

    // Set saved speed
    if (selSpeed) selSpeed.value = String(prefRate);

    // Populate voices (may fire asynchronously)
    populateVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = populateVoices;
    }

    updateUI();
  });

  // Cancel speech when navigating away
  window.addEventListener('beforeunload', function () {
    synth.cancel();
  });
})();
