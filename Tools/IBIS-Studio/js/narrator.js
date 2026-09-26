/**
 * narrator.js — Rising Edge IBIS-Studio
 * Web Speech API narrator with full playback controls.
 *
 * Exports global: Narrator
 */

const Narrator = (function () {
  'use strict';

  const synth = window.speechSynthesis;
  let _utterance = null;
  let _queue = []; // array of sentence strings
  let _currentIdx = 0;
  let _playing = false;
  let _paused = false;
  let _rate = 1.0;
  let _pitch = 1.0;
  let _ccEnabled = false;
  let _voiceIdx = 0;
  let _voices = [];

  /* ─── Voice loading ──────────────────────────────────────────────── */
  function loadVoices() {
    _voices = synth.getVoices().filter(v => v.lang.startsWith('en'));
    const sel = document.getElementById('nar-voice');
    if (!sel) return;
    sel.innerHTML = _voices
      .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
      .join('');
    sel.addEventListener('change', () => {
      _voiceIdx = parseInt(sel.value);
    });
  }

  if (synth) {
    if (synth.getVoices().length) loadVoices();
    else synth.addEventListener('voiceschanged', loadVoices);
  }

  /* ─── Sentence segmentation ─────────────────────────────────────── */
  function toSentences(text) {
    // Split on sentence-ending punctuation, preserve some context
    return text
      .replace(/\n+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /* ─── Caption display ───────────────────────────────────────────── */
  function showCaption(text) {
    const el = document.getElementById('nar-caption');
    if (!el) return;
    el.textContent = _ccEnabled ? text : '';
    el.classList.toggle('active', _ccEnabled && !!text);
  }

  function clearCaption() {
    const el = document.getElementById('nar-caption');
    if (el) {
      el.textContent = '';
      el.classList.remove('active');
    }
  }

  /* ─── Progress bar ───────────────────────────────────────────────── */
  function updateProgress() {
    const bar = document.getElementById('nar-progress');
    if (bar && _queue.length > 0) {
      const pct = Math.round((_currentIdx / _queue.length) * 100);
      bar.style.width = pct + '%';
    }
    const time = document.getElementById('nar-time');
    if (time) time.textContent = `${_currentIdx}/${_queue.length}`;
  }

  /* ─── Core playback ─────────────────────────────────────────────── */
  function speakCurrent() {
    if (_currentIdx >= _queue.length) {
      stop();
      return;
    }

    const sentence = _queue[_currentIdx];
    _utterance = new SpeechSynthesisUtterance(sentence);
    _utterance.rate = _rate;
    _utterance.pitch = _pitch;
    if (_voices[_voiceIdx]) _utterance.voice = _voices[_voiceIdx];

    _utterance.onstart = () => {
      showCaption(sentence);
      updateProgress();
      _setPlayIcon(true);
    };

    _utterance.onend = () => {
      _currentIdx++;
      if (_playing && !_paused) speakCurrent();
    };

    _utterance.onerror = e => {
      console.warn('[Narrator] Speech error:', e.error);
      _currentIdx++;
      if (_playing && !_paused) speakCurrent();
    };

    synth.speak(_utterance);
  }

  function play() {
    if (!synth) {
      _noSpeech();
      return;
    }
    if (_paused) {
      synth.resume();
      _paused = false;
      _playing = true;
      _setPlayIcon(true);
      return;
    }
    if (_playing) return;
    _playing = true;
    _paused = false;
    speakCurrent();
  }

  function pause() {
    if (!synth || !_playing) return;
    synth.pause();
    _paused = true;
    _playing = false;
    _setPlayIcon(false);
  }

  function stop() {
    if (!synth) return;
    synth.cancel();
    _playing = false;
    _paused = false;
    _currentIdx = 0;
    clearCaption();
    updateProgress();
    _setPlayIcon(false);
  }

  function prev() {
    if (!synth) return;
    synth.cancel();
    _currentIdx = Math.max(0, _currentIdx - 2);
    if (_playing) speakCurrent();
  }

  function next() {
    if (!synth) return;
    synth.cancel();
    _currentIdx = Math.min(_queue.length - 1, _currentIdx + 1);
    if (_playing) speakCurrent();
  }

  function setSpeed(rate) {
    _rate = parseFloat(rate) || 1.0;
  }

  function toggleCC() {
    _ccEnabled = !_ccEnabled;
    const btn = document.getElementById('nar-cc');
    if (btn) btn.classList.toggle('active', _ccEnabled);
    if (!_ccEnabled) clearCaption();
  }

  // The HTML uses two separate buttons (nar-play / nar-pause) that swap
  // visibility, rather than a single button that swaps its icon.
  function _setPlayIcon(playing) {
    const playBtn = document.getElementById('nar-play');
    const pauseBtn = document.getElementById('nar-pause');
    if (playBtn) playBtn.style.display = playing ? 'none' : '';
    if (pauseBtn) pauseBtn.style.display = playing ? '' : 'none';
  }

  function _noSpeech() {
    if (typeof IBISApp !== 'undefined') {
      IBISApp.showToast('Web Speech API not available in this browser', 'warning');
    }
  }

  /* ─── Load content ────────────────────────────────────────────────── */
  function load(text) {
    stop();
    _queue = toSentences(text);
    _currentIdx = 0;
    updateProgress();
  }

  function loadContent(contentEl) {
    if (!contentEl) return;
    load(contentEl.innerText || contentEl.textContent || '');
  }

  /* ─── Wire up DOM controls ────────────────────────────────────────── */
  function initControls() {
    const wire = (id, fn) => {
      const el = document.getElementById(id);
      if (el && !el._narratorWired) {
        el.addEventListener('click', fn);
        el._narratorWired = true;
      }
    };

    // Play needs to (re)load whatever Learn topic is currently active
    // before speaking, otherwise the queue is empty and nothing happens.
    wire('nar-play', () => {
      const active = document.querySelector('.learn-topic-content.active');
      if (active && !_playing && !_paused) loadContent(active);
      play();
    });
    wire('nar-pause', pause);
    wire('nar-prev', prev);
    wire('nar-next', next);
    wire('nar-cc', toggleCC);

    // nar-speed is a <select> with fixed options, not a range slider.
    const speedSelect = document.getElementById('nar-speed');
    if (speedSelect && !speedSelect._narratorWired) {
      speedSelect.addEventListener('change', () => setSpeed(speedSelect.value));
      speedSelect._narratorWired = true;
    }

    loadVoices();
  }

  /* ─── Public API ─────────────────────────────────────────────────── */
  return {
    play,
    pause,
    stop,
    prev,
    next,
    setSpeed,
    toggleCC,
    load,
    loadContent,
    initControls,
    isPlaying: () => _playing,
    isPaused: () => _paused,
  };
})();
