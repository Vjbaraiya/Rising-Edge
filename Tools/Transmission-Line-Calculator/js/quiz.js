/**
 * Transmission Line Calculator — Quiz
 * Question bank + scoring engine. Renders one question at a time into
 * #tlc-quiz-body, tracks answers, and shows a final score screen.
 */
'use strict';

(function () {
  const QUESTIONS = [
    {
      q: 'Characteristic impedance Z0 of a PCB trace is defined as:',
      options: [
        'The DC resistance of the copper trace',
        '√(L′/C′), the ratio set by per-unit-length inductance and capacitance',
        'The resistance of the reference plane',
        'A fixed constant that depends only on copper thickness',
      ],
      correct: 1,
      explain:
        'Z0 = √(L′/C′) is set entirely by the trace geometry and surrounding dielectric (which determine per-unit-length inductance and capacitance) — it is not a lumped resistor and dissipates no power on an ideal lossless line.',
    },
    {
      q: 'A trace must be treated as a distributed transmission line (rather than a lumped node) once:',
      options: [
        'It is longer than 100 mm',
        'The one-way propagation delay exceeds roughly 1/6 of the signal rise time',
        'It carries more than 1 A',
        'It crosses a plane split',
      ],
      correct: 1,
      explain:
        'The common rule of thumb is tPD > trise/6 — once the trace delay is a significant fraction of the edge rate, reflections from an impedance mismatch have time to build up before the edge finishes.',
    },
    {
      q: 'For a fixed trace width, increasing the dielectric height H under a microstrip trace (moving the reference plane farther away) will:',
      options: ['Increase Z0', 'Decrease Z0', 'Have no effect on Z0', 'Only affect εeff, never Z0'],
      correct: 0,
      explain:
        'A larger H means less capacitance per unit length between the trace and the plane, and since Z0 ∝ 1/√C′ (roughly), a taller dielectric raises Z0 for the same trace width.',
    },
    {
      q: 'Embedding a microstrip trace fully in dielectric (no air above) compared to an identical surface microstrip geometry will:',
      options: [
        'Raise Z0 because εeff drops',
        'Lower Z0 because εeff rises toward the bulk εr',
        'Leave Z0 unchanged',
        'Only affect propagation delay, not Z0',
      ],
      correct: 1,
      explain:
        'A surface microstrip has fields partly in air (εr=1) and partly in dielectric, giving an εeff below εr. Fully embedding the trace removes the air contribution, raising εeff toward εr — and since Z0 ∝ 1/√εeff for the same physical geometry, Z0 drops.',
    },
    {
      q: 'Why is stripline generally considered lower-EMI / better shielded than microstrip?',
      options: [
        'Stripline traces are always wider',
        'The signal field is fully enclosed between two reference planes instead of open to air on one side',
        'Stripline never carries high-speed signals',
        'Stripline uses a different copper alloy',
      ],
      correct: 1,
      explain:
        'A stripline trace sits between two continuous reference planes, so its field is fully contained inside the dielectric with no path for direct radiation the way an exposed microstrip surface field has.',
    },
    {
      q: 'What is the key structural difference between symmetric and asymmetric (offset) stripline?',
      options: [
        'Asymmetric stripline has only one reference plane',
        'The trace sits at unequal distances from the two reference planes instead of exactly centered',
        'Asymmetric stripline carries differential signals only',
        'There is no real difference — the terms are interchangeable',
      ],
      correct: 1,
      explain:
        "Symmetric stripline centers the trace exactly between two equal-spacing planes; asymmetric (offset) stripline has the trace closer to one plane than the other, which is common in real stack-ups where layer spacing isn't perfectly symmetric.",
    },
    {
      q: 'For a differential microstrip pair, tightening the spacing S between the two traces (bringing them closer together) generally:',
      options: [
        'Increases Zdiff toward 2× the single-ended Z0',
        'Decreases Zdiff below 2× the single-ended Z0 due to coupling',
        'Has no effect on Zdiff, only on Z0 single-ended',
        'Converts the pair into a coplanar waveguide',
      ],
      correct: 1,
      explain:
        'Tighter spacing increases odd-mode coupling capacitance between the two traces, which lowers the odd-mode impedance and therefore Zdiff = 2×Zodd. As spacing grows large, coupling vanishes and Zdiff approaches 2×Z0 (uncoupled).',
    },
    {
      q: 'Coplanar waveguide with ground (CPWG) is commonly chosen over microstrip when:',
      options: [
        'The design needs the cheapest possible 2-layer board with no ground pour',
        'RF/connector-breakout applications need controlled impedance without a deep multi-layer stack-up, using adjacent ground pours',
        'The signal never exceeds 1 kHz',
        'Differential signaling is impossible on the board',
      ],
      correct: 1,
      explain:
        'CPWG adds coplanar ground pours beside the trace (with gap G) in addition to a bottom reference plane, letting designers hit a target impedance on a thin or shallow stack-up — common on RF front-ends and connector breakout regions.',
    },
    {
      q: 'Why does stripline generally have a longer propagation delay (slower velocity) than microstrip at the same nominal εr?',
      options: [
        'Stripline traces are physically longer',
        "Stripline's εeff equals the full εr (homogeneous dielectric), while microstrip's εeff is a lower air/dielectric blend, and tpd = √εeff / c",
        'Stripline uses thicker copper, which slows electrons',
        'There is no actual difference in propagation delay',
      ],
      correct: 1,
      explain:
        "Since tpd = √εeff / c, and microstrip's partial exposure to air gives it a lower εeff than the fully-enclosed stripline (εeff = εr), microstrip signals propagate faster (lower tpd) than stripline signals at the same base εr.",
    },
    {
      q: 'A common mistake in Z0 hand calculations is using εr directly instead of εeff when computing propagation delay for a microstrip. Why does this matter?',
      options: [
        'εr and εeff are always numerically identical, so it never matters',
        'εeff accounts for the field being split between air and dielectric, giving the correct (faster) delay than using the full bulk εr would predict',
        'εr is only used for stripline, never microstrip',
        'Using εr instead of εeff always makes the calculated delay too short',
      ],
      correct: 1,
      explain:
        'εeff < εr for microstrip because part of the field is in air. Using εr directly overstates the effective dielectric loading and gives an incorrectly long delay/slow velocity estimate for a surface microstrip.',
    },
    {
      q: 'Typical PCB fabrication tolerance on realized Z0 (from etch width variation, dielectric thickness variation, etc.) is commonly quoted as approximately:',
      options: ['±0.1%', '±10%', '±50%', 'Exactly 0%, fabrication is always perfect'],
      correct: 1,
      explain:
        'A commonly quoted controlled-impedance fabrication tolerance is roughly ±10% (tighter, e.g. ±7-8%, is achievable at added cost with an impedance-control service) — driven mainly by etch (trace width/thickness) and dielectric thickness variation.',
    },
    {
      q: 'Which statement about "50 Ω is always the target impedance" is most accurate?',
      options: [
        'It is always true — every trace on every board should be 50 Ω',
        'It is a common single-ended digital/RF default, but differential standards commonly target 90 Ω, 100 Ω, or 120 Ω instead, and DDR nets often target 40–60 Ω single-ended depending on ODT',
        'Differential pairs are also always exactly 50 Ω per leg summed',
        '50 Ω only applies to power planes, never signal traces',
      ],
      correct: 1,
      explain:
        'This is a common myth. 50 Ω is a widespread convention for single-ended RF/digital I/O, but real designs use many targets: ~90 Ω differential for USB/PCIe-class pairs, ~100 Ω for HDMI-class pairs, and DDR single-ended targets that vary with ODT settings.',
    },
    {
      q: 'Time-Domain Reflectometry (TDR) is used in transmission-line verification to:',
      options: [
        'Program the FPGA I/O impedance registers automatically',
        'Launch a fast step and measure the reflected voltage vs. time, revealing the actual impedance profile along the fabricated trace',
        'Replace the need for a controlled-impedance stack-up specification entirely',
        'Measure only DC resistance, not impedance',
      ],
      correct: 1,
      explain:
        'A TDR launches a fast edge into the trace and reads the reflected voltage over time; the shape and timing of the reflection reveal the local impedance along the trace, letting engineers confirm the fabricated Z0 matches the calculated/specified value.',
    },
  ];

  let currentIndex = 0;
  let answers = new Array(QUESTIONS.length).fill(null);
  let finished = false;

  function $(id) {
    return document.getElementById(id);
  }

  function renderProgress() {
    const el = $('tlc-quiz-progress');
    if (!el) return;
    if (finished) {
      el.textContent = 'Quiz complete';
      return;
    }
    el.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
  }

  function renderQuestion() {
    const body = $('tlc-quiz-body');
    if (!body) return;
    const item = QUESTIONS[currentIndex];
    const selected = answers[currentIndex];

    let optionsHtml = item.options
      .map((opt, i) => {
        let cls = 'tlc-quiz-option';
        if (selected !== null) {
          if (i === item.correct) cls += ' correct';
          else if (i === selected && selected !== item.correct) cls += ' incorrect';
          if (i === selected) cls += ' selected';
        }
        return `<button type="button" class="${cls}" data-option="${i}" ${selected !== null ? 'disabled' : ''}>${opt}</button>`;
      })
      .join('');

    body.innerHTML = `
      <div class="tlc-quiz-question">${item.q}</div>
      <div class="tlc-quiz-options">${optionsHtml}</div>
      ${selected !== null ? `<div class="tlc-quiz-explain"><strong>${selected === item.correct ? 'Correct.' : 'Not quite.'}</strong> ${item.explain}</div>` : ''}
    `;

    body.querySelectorAll('[data-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-option'), 10);
        answers[currentIndex] = idx;
        renderQuestion();
      });
    });

    $('tlc-quiz-prev').disabled = currentIndex === 0;
    $('tlc-quiz-next').textContent = currentIndex === QUESTIONS.length - 1 ? 'See score' : 'Next';
    $('tlc-quiz-next').hidden = false;
    $('tlc-quiz-restart').hidden = true;
    renderProgress();
  }

  function renderScore() {
    finished = true;
    const body = $('tlc-quiz-body');
    const correctCount = answers.reduce(
      (sum, a, i) => sum + (a === QUESTIONS[i].correct ? 1 : 0),
      0
    );
    const pct = Math.round((correctCount / QUESTIONS.length) * 100);
    let tier = 'Keep practicing';
    if (pct >= 90) tier = 'Transmission-line expert';
    else if (pct >= 70) tier = 'Solid grasp';
    else if (pct >= 50) tier = 'Getting there';

    body.innerHTML = `
      <div class="tlc-quiz-score">
        <div class="tlc-quiz-score-num">${correctCount}/${QUESTIONS.length}</div>
        <p>${pct}% correct — <strong>${tier}</strong></p>
        <p style="margin-top:10px;color:var(--text-faint);font-size:var(--text-xs)">Review the Engineering Notes accordion for topics you missed, then retake the quiz.</p>
      </div>
    `;
    $('tlc-quiz-prev').disabled = true;
    $('tlc-quiz-next').hidden = true;
    $('tlc-quiz-restart').hidden = false;
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
    if (!$('tlc-quiz-body')) return;
    $('tlc-quiz-next').addEventListener('click', next);
    $('tlc-quiz-prev').addEventListener('click', prev);
    $('tlc-quiz-restart').addEventListener('click', restart);
    renderQuestion();
  }

  window.TLCQuiz = { init, QUESTIONS };
})();
