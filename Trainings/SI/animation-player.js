/* animation-player.js
 * Auto-injects a narration play button into every animation widget that has a
 * registered talking point in SI_NARRATIONS (animation-narrations.js).
 *
 * Button behaviour:
 *   Click once  → starts reading the narration with SpeechSynthesis
 *   Click again → stops reading mid-sentence
 *   Reads at the currently selected reader speed (shared with reader.js)
 *
 * Depends on: animation-narrations.js loaded before this script.
 */
(function () {
  'use strict';

  if (typeof SI_NARRATIONS === 'undefined') return;

  /* ── Shared speech state ── */
  var currentUtterance = null;
  var activeBtn = null;

  function getSpeed() {
    var sel = document.getElementById('reader-speed');
    return sel ? parseFloat(sel.value) || 1 : 1;
  }

  function getVoice() {
    var sel = document.getElementById('reader-voice');
    if (!sel || !sel.value) return null;
    var voices = speechSynthesis.getVoices();
    return (
      voices.find(function (v) {
        return v.name === sel.value;
      }) || null
    );
  }

  function stopCurrent() {
    if (currentUtterance) {
      speechSynthesis.cancel();
      currentUtterance = null;
    }
    if (activeBtn) {
      setButtonState(activeBtn, false);
      activeBtn = null;
    }
  }

  function setButtonState(btn, playing) {
    if (playing) {
      btn.setAttribute('data-playing', 'true');
      btn.title = 'Stop narration';
      btn.innerHTML =
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="6" height="16" rx="1"/><rect x="14" y="4" width="6" height="16" rx="1"/></svg>' +
        '<span>Stop</span>';
      btn.style.color = 'var(--cyan, #22d3ee)';
      btn.style.borderColor = 'var(--cyan, #22d3ee)';
    } else {
      btn.removeAttribute('data-playing');
      btn.title = 'Read narration for this animation';
      btn.innerHTML =
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
        '<span>Narrate</span>';
      btn.style.color = '';
      btn.style.borderColor = '';
    }
  }

  function speak(text, btn) {
    if (!window.speechSynthesis) return;
    stopCurrent();

    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = getSpeed();
    var voice = getVoice();
    if (voice) utter.voice = voice;

    utter.onend = function () {
      if (currentUtterance === utter) {
        currentUtterance = null;
        setButtonState(btn, false);
        activeBtn = null;
      }
    };
    utter.onerror = function () {
      currentUtterance = null;
      if (activeBtn === btn) {
        setButtonState(btn, false);
        activeBtn = null;
      }
    };

    currentUtterance = utter;
    activeBtn = btn;
    setButtonState(btn, true);
    speechSynthesis.speak(utter);
  }

  /* ── Build a narration button ── */
  function makeButton(text) {
    var btn = document.createElement('button');
    btn.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:5px',
      'padding:4px 10px',
      'border-radius:6px',
      'border:1px solid var(--border)',
      'background:var(--bg-card, var(--surface-1))',
      'color:var(--text-sub)',
      'font-size:0.75rem',
      'font-family:inherit',
      'cursor:pointer',
      'flex-shrink:0',
    ].join(';');

    btn.addEventListener('mouseenter', function () {
      if (!btn.getAttribute('data-playing')) btn.style.borderColor = 'var(--cyan, #22d3ee)';
    });
    btn.addEventListener('mouseleave', function () {
      if (!btn.getAttribute('data-playing')) btn.style.borderColor = '';
    });

    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-playing')) {
        stopCurrent();
      } else {
        speak(text, btn);
      }
    });

    setButtonState(btn, false);
    return btn;
  }

  /* ── Inject buttons after DOM is ready ── */
  function inject() {
    Object.keys(SI_NARRATIONS).forEach(function (canvasId) {
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;

      var narration = SI_NARRATIONS[canvasId];

      /* Walk up the DOM to find the nearest widget-container or plot-area parent */
      var container = canvas.closest
        ? canvas.closest('.widget-container, .demo-canvas-box')
        : (function () {
            var el = canvas.parentElement;
            while (el) {
              if (/widget-container|demo-canvas-box/.test(el.className)) return el;
              el = el.parentElement;
            }
            return null;
          })();

      if (!container) return;

      /* Find or create a header row to attach the button */
      var header = container.querySelector('.widget-header, .demo-canvas-title');
      if (!header) {
        /* Create a minimal header if the widget has none */
        header = document.createElement('div');
        header.style.cssText =
          'display:flex;align-items:center;justify-content:flex-end;margin-bottom:0.5rem';
        container.insertBefore(header, container.firstChild);
      }

      /* Make the header flex so the button sits at the far right */
      if (getComputedStyle(header).display !== 'flex') {
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        header.style.gap = '0.5rem';
      }

      /* Avoid adding duplicate buttons (e.g. two canvas IDs in the same widget) */
      if (container.querySelector('.anim-narrate-btn')) return;

      var btn = makeButton(narration);
      btn.className = 'anim-narrate-btn';
      header.appendChild(btn);
    });
  }

  /* Stop speech when reader.js takes over (if present) */
  document.addEventListener('reader-started', stopCurrent);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
