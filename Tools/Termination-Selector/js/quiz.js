/**
 * Termination Selector — Quiz
 * Question bank + scoring engine. Renders one question at a time into
 * #ts-quiz-body, tracks answers, and shows a final score screen.
 */
'use strict';

(function () {
  const QUESTIONS = [
    {
      q: 'A load impedance exactly equal to the line impedance Z0 produces a reflection coefficient of:',
      options: ['+1', '0', '−1', 'It depends on VDD'],
      correct: 1,
      explain:
        'Γ = (Z_L − Z0)/(Z_L + Z0). When Z_L = Z0, the numerator is zero, so Γ = 0 — a perfectly matched load reflects nothing.',
    },
    {
      q: 'Series termination is calculated as Rs = Z0 − Rdriver. Why subtract Rdriver?',
      options: [
        'To account for the driver output impedance already being part of the source-side resistance',
        'Because Rdriver always equals Z0',
        'To intentionally under-terminate the line',
        'It is a rule of thumb with no physical basis',
      ],
      correct: 0,
      explain:
        'The total source-side resistance the line sees is Rs + Rdriver. For a matched source (Γsource ≈ 0), that total must equal Z0, so Rs = Z0 − Rdriver.',
    },
    {
      q: 'On a properly series-terminated point-to-point net with an open receiver, the launched voltage at the driver is approximately:',
      options: ['VDD', 'VDD / 2', 'VDD / 4', '0 V'],
      correct: 1,
      explain:
        'A matched source-side resistance creates a voltage divider between the source resistance and Z0, launching roughly half of VDD; the open far end then reflects and doubles it back to full VDD.',
    },
    {
      q: 'Why is parallel termination usually avoided on battery-powered, power-constrained designs?',
      options: [
        'It cannot be implemented on a PCB',
        'It draws continuous DC current whenever the line is held at a static logic level',
        'It only works above 1 GHz',
        'It requires a differential pair',
      ],
      correct: 1,
      explain:
        'A resistor at Z0 to ground or VTT conducts continuously any time the line idles high or low, unlike series termination which only conducts during switching transients.',
    },
    {
      q: 'What two conditions must Thevenin termination resistors R1 and R2 simultaneously satisfy?',
      options: [
        'R1 = R2 and R1 + R2 = Z0',
        'R1‖R2 = Z0 and the divider ratio sets the correct idle bias voltage',
        'R1 must be zero and R2 must equal Z0',
        'Both resistors must equal VDD/2',
      ],
      correct: 1,
      explain:
        'R1‖R2 must equal Z0 for AC matching, while the R1:R2 ratio (R2/(R1+R2) × VDD) must set the desired idle bias voltage on the line.',
    },
    {
      q: 'AC (RC) termination has zero static power because:',
      options: [
        'The resistor value is always 0 Ω',
        'The capacitor blocks DC current once charged, so no continuous current flows',
        'It only works on differential pairs',
        'The resistor is switched off electronically',
      ],
      correct: 1,
      explain:
        'The series capacitor charges up and then blocks further DC current, so R only dissipates power transiently during edges, not continuously.',
    },
    {
      q: 'A differential pair with single-ended trace impedance Z0 = 50 Ω and light coupling has a differential termination resistor value closest to:',
      options: ['25 Ω', '50 Ω', '90–100 Ω', '200 Ω'],
      correct: 2,
      explain:
        'Differential impedance is typically slightly less than 2× the single-ended Z0 due to coupling — commonly landing around 90–100 Ω for 50 Ω single-ended traces (e.g., LVDS, USB, PCIe-class pairs).',
    },
    {
      q: 'Which topology is series termination LEAST suited for?',
      options: [
        'Point-to-point single receiver',
        'Multi-drop bus with several receivers tapped along the line',
        'A short GPIO trace to one device',
        'A single clock output to one buffer input',
      ],
      correct: 1,
      explain:
        'Series termination relies on the doubling reflection at a single far-end receiver. Intermediate taps on a multi-drop bus see only a half-amplitude step before the wave has doubled — usually insufficient noise margin.',
    },
    {
      q: 'RS-485 (TIA/EIA-485) specifies termination:',
      options: [
        'At the exact middle of the bus only',
        'At both physical ends of the twisted-pair bus, never mid-bus',
        'Only at the master device',
        'Termination is not specified by the standard',
      ],
      correct: 1,
      explain:
        'TIA/EIA-485 calls for 120 Ω termination at each physical end of the cable and explicitly warns against terminating at intermediate nodes, which loads the bus incorrectly.',
    },
    {
      q: 'Time-Domain Reflectometry (TDR) is used in termination verification to:',
      options: [
        'Measure the color of the PCB soldermask',
        'Directly observe the local impedance profile along a trace by launching a step and reading the reflected voltage over time',
        'Program the FPGA I/O termination registers',
        'Replace the need for a controlled-impedance stack-up',
      ],
      correct: 1,
      explain:
        'A TDR launches a fast edge and measures the reflected voltage vs. time; the shape of the reflection reveals impedance discontinuities and lets engineers confirm Z0 and validate termination placement and value.',
    },
  ];

  let currentIndex = 0;
  let answers = new Array(QUESTIONS.length).fill(null);
  let finished = false;

  function $(id) {
    return document.getElementById(id);
  }

  function renderProgress() {
    const el = $('ts-quiz-progress');
    if (!el) return;
    if (finished) {
      el.textContent = 'Quiz complete';
      return;
    }
    el.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
  }

  function renderQuestion() {
    const body = $('ts-quiz-body');
    if (!body) return;
    const item = QUESTIONS[currentIndex];
    const selected = answers[currentIndex];

    let optionsHtml = item.options
      .map((opt, i) => {
        let cls = 'ts-quiz-option';
        if (selected !== null) {
          if (i === item.correct) cls += ' correct';
          else if (i === selected && selected !== item.correct) cls += ' incorrect';
          if (i === selected) cls += ' selected';
        }
        return `<button type="button" class="${cls}" data-option="${i}" ${selected !== null ? 'disabled' : ''}>${opt}</button>`;
      })
      .join('');

    body.innerHTML = `
      <div class="ts-quiz-question">${item.q}</div>
      <div class="ts-quiz-options">${optionsHtml}</div>
      ${selected !== null ? `<div class="ts-quiz-explain"><strong>${selected === item.correct ? 'Correct.' : 'Not quite.'}</strong> ${item.explain}</div>` : ''}
    `;

    body.querySelectorAll('[data-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-option'), 10);
        answers[currentIndex] = idx;
        renderQuestion();
      });
    });

    $('ts-quiz-prev').disabled = currentIndex === 0;
    $('ts-quiz-next').textContent = currentIndex === QUESTIONS.length - 1 ? 'See score' : 'Next';
    $('ts-quiz-next').hidden = false;
    $('ts-quiz-restart').hidden = true;
    renderProgress();
  }

  function renderScore() {
    finished = true;
    const body = $('ts-quiz-body');
    const correctCount = answers.reduce(
      (sum, a, i) => sum + (a === QUESTIONS[i].correct ? 1 : 0),
      0
    );
    const pct = Math.round((correctCount / QUESTIONS.length) * 100);
    let tier = 'Keep practicing';
    if (pct >= 90) tier = 'Termination expert';
    else if (pct >= 70) tier = 'Solid grasp';
    else if (pct >= 50) tier = 'Getting there';

    body.innerHTML = `
      <div class="ts-quiz-score">
        <div class="ts-quiz-score-num">${correctCount}/${QUESTIONS.length}</div>
        <p>${pct}% correct — <strong>${tier}</strong></p>
        <p style="margin-top:10px;color:var(--text-faint);font-size:var(--text-xs)">Review the Engineering Notes accordion for topics you missed, then retake the quiz.</p>
      </div>
    `;
    $('ts-quiz-prev').disabled = true;
    $('ts-quiz-next').hidden = true;
    $('ts-quiz-restart').hidden = false;
    renderProgress();
  }

  function next() {
    if (currentIndex < QUESTIONS.length - 1) {
      currentIndex++;
      renderQuestion();
    } else {
      renderScore();
    }
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      finished = false;
      renderQuestion();
    }
  }

  function restart() {
    currentIndex = 0;
    answers = new Array(QUESTIONS.length).fill(null);
    finished = false;
    renderQuestion();
  }

  function init() {
    if (!$('ts-quiz-body')) return;
    $('ts-quiz-next').addEventListener('click', next);
    $('ts-quiz-prev').addEventListener('click', prev);
    $('ts-quiz-restart').addEventListener('click', restart);
    renderQuestion();
  }

  window.TSQuiz = { init, QUESTIONS };
})();
