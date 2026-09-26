(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const topics = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      keywords: 'quick start beginner workflow first calculation',
      html: `<h2>Getting Started</h2><p>Complete a basic MTBF estimate in about 5–10 minutes.</p><ol><li>Choose a prediction standard and environmental condition.</li><li>Set operating temperature, mission time, confidence level, and MTTR.</li><li>Add components from the built-in library or import a CSV.</li><li>Select <strong>Run Calculation</strong> to compute MTBF, reliability, and availability.</li><li>Review the charts, block diagram, and recommendations.</li><li>Explore what-if presets, then export a CSV/JSON report or print.</li></ol><div class="help-callout"><strong>Tip:</strong> Click <em>Load example</em> for a ready-made component list.</div>`,
    },
    {
      id: 'interface',
      title: 'Interface Overview',
      keywords: 'hero input panel component table results charts export sections',
      html: `<h2>Interface Overview</h2><h3>Hero</h3><p>Summarizes the tool and provides shortcuts to calculate, load an example, open Help, or jump to the reliability engineering notes.</p><h3>Input column</h3><p>Steps 01–04 define conditions, component list, block diagram, and what-if analysis.</p><h3>Results column</h3><p>Step 05 presents MTBF, failure rate, reliability, availability, five charts, recommendations, and export controls.</p><div class="help-diagram">Standard & conditions → Component list → Block diagram → What-if → MTBF, reliability, charts, and report</div>`,
    },
    {
      id: 'inputs',
      title: 'Input Parameters',
      keywords: 'standard environment temperature mission time confidence MTTR units ranges',
      html: `<h2>Input Parameters</h2><table><thead><tr><th>Field</th><th>Units / range</th><th>Meaning</th></tr></thead><tbody><tr><td>Prediction standard</td><td>IEC 61709 / MIL-HDBK-217F / Telcordia SR-332 / Custom FIT</td><td>Documents intent and drives the standards comparison chart.</td></tr><tr><td>Environmental conditions</td><td>9 presets</td><td>Sets the environment factor (πE-style multiplier) applied to every component.</td></tr><tr><td>Operating temperature</td><td>-40°C to 125°C</td><td>Drives an Arrhenius-style temperature acceleration factor.</td></tr><tr><td>Mission time</td><td>&gt;0, any unit</td><td>Duration used for reliability R(t) and failure probability F(t).</td></tr><tr><td>Confidence level</td><td>50/60/90/95/99%</td><td>Informational note on statistical MTBF ranges; the core point estimate is unaffected.</td></tr><tr><td>MTTR</td><td>hours, ≥0</td><td>Mean Time To Repair, used for the availability calculation.</td></tr></tbody></table>`,
    },
    {
      id: 'interface2',
      title: 'Component Table',
      keywords: 'component table add remove duplicate import export csv library quantity FIT',
      html: `<h2>Component Table</h2><p>Each row represents a component type with a quantity and base FIT (failures per 10^9 hours). Calculated FIT = base FIT × quantity × temperature factor × environment factor, recalculated live as global conditions change.</p><ul><li><strong>Add from library:</strong> choose a built-in part and quantity.</li><li><strong>Add blank row:</strong> create a fully custom entry.</li><li><strong>Duplicate / Remove:</strong> per-row icon buttons.</li><li><strong>Import/Export CSV:</strong> bulk load or save the component list.</li></ul>`,
    },
    {
      id: 'blockdiagram',
      title: 'Reliability Block Diagram',
      keywords: 'block diagram series parallel mixed redundancy topology',
      html: `<h2>Reliability Block Diagram</h2><p>Model 2–6 blocks in Series, Parallel (redundant), or Mixed topology, each with its own reliability value (0–1).</p><ul><li><strong>Series:</strong> Rsystem = R1 × R2 × ... × Rn — all blocks must work.</li><li><strong>Parallel:</strong> Rsystem = 1 − (1−R1)(1−R2)...(1−Rn) — only one block needs to work.</li><li><strong>Mixed:</strong> splits blocks into two parallel groups combined in series, a simplified pragmatic combination.</li></ul>`,
    },
    {
      id: 'whatif',
      title: 'Sensitivity / What-if Analysis',
      keywords: 'whatif sensitivity temperature quantity FIT multiplier preset',
      html: `<h2>Sensitivity / What-if Analysis</h2><p>Quick-adjust temperature, a chosen component's quantity or FIT multiplier, and mission time multiplier to see the resulting MTBF and reliability delta versus the current baseline calculation.</p><p>Canned presets apply realistic design changes: derating a capacitor, improving FPGA cooling, adding redundant power (switches the block diagram to parallel), or raising operating temperature by 20°C.</p>`,
    },
    {
      id: 'calculations',
      title: 'Calculations',
      keywords: 'formula FIT lambda MTBF reliability availability equations',
      html: `<h2>Calculations</h2><h3>Total FIT</h3><p><strong>Total FIT = Σ(component FIT × quantity)</strong>, each row scaled by temperature and environment factors.</p><h3>Failure rate</h3><p><strong>λ = Total FIT × 10⁻⁹</strong> failures/hour.</p><h3>MTBF</h3><p><strong>MTBF = 1/λ</strong> hours.</p><h3>Reliability</h3><p><strong>R(t) = e^(−λt)</strong> for mission time t.</p><h3>Failure probability</h3><p><strong>F(t) = 1 − R(t)</strong>.</p><h3>Availability</h3><p><strong>A = MTBF / (MTBF + MTTR)</strong>.</p><h3>Temperature factor</h3><p>Arrhenius-style: <strong>AF = exp[(Ea/k)(1/Tref − 1/Tuse)]</strong> with Ea ≈ 0.4 eV.</p>`,
    },
    {
      id: 'charts',
      title: 'Charts',
      keywords: 'reliability failure comparison contribution pareto chart axes legend',
      html: `<h2>Charts</h2><ul><li><strong>Reliability vs Time:</strong> R(t) decaying from 1 toward 0.</li><li><strong>Failure Probability vs Time:</strong> F(t) rising from 0 toward 1.</li><li><strong>MTBF Comparison:</strong> bar chart of MTBF across the 4 prediction standards.</li><li><strong>Component Contribution:</strong> pie chart of % of total FIT by component.</li><li><strong>Pareto Chart:</strong> top FIT contributors with a cumulative percentage line to identify the "vital few" driving system failure rate.</li></ul>`,
    },
    {
      id: 'results',
      title: 'Results',
      keywords: 'MTBF lambda reliability availability interpretation',
      html: `<h2>Interpreting Results</h2><h3>MTBF</h3><p>Average time between failures under the constant-failure-rate assumption. Displayed in the most readable unit (hours/days/years).</p><h3>Failure rate (λ)</h3><p>Instantaneous failure rate in failures per hour.</p><h3>Reliability R(t)</h3><p>Probability of zero failures through the specified mission time.</p><h3>Availability</h3><p>Fraction of time the system is expected to be operational, accounting for MTTR.</p>`,
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      keywords: 'warnings guidance derate redundancy temperature quantity',
      html: `<h2>Recommendations</h2><p>Rule-based guidance is generated from the calculated results: dominant FIT contributors, elevated operating temperature, availability below target, low mission-time reliability, and unusually high component quantities.</p>`,
    },
    {
      id: 'reports',
      title: 'Reports & Buttons',
      keywords: 'export csv json print save load buttons',
      html: `<h2>Buttons, Reports & Export</h2><table><thead><tr><th>Control</th><th>Action</th></tr></thead><tbody><tr><td>Run Calculation</td><td>Computes FIT, MTBF, reliability, availability, and refreshes all charts.</td></tr><tr><td>Load example</td><td>Loads a representative component list and conditions.</td></tr><tr><td>Export CSV</td><td>Writes a results + component-breakdown CSV report.</td></tr><tr><td>Export JSON</td><td>Writes a full configuration + result snapshot, also loadable back into the tool.</td></tr><tr><td>Load configuration</td><td>Restores inputs from a previously exported JSON file.</td></tr><tr><td>Print report</td><td>Uses the browser print dialog with a dedicated print layout.</td></tr></tbody></table><p>Note: only CSV export, JSON save/load, and print are implemented — there is no PDF or Excel generator.</p>`,
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      keywords: 'why different vendor number confidence redundancy activation energy',
      html: `<h2>Frequently Asked Questions</h2><h3>Why does my MTBF differ from a vendor datasheet?</h3><p>Different base FIT sources, stress models, and environment assumptions produce different results. Confirm the standard and conditions behind any quoted MTBF.</p><h3>Does a high MTBF guarantee no early failures?</h3><p>No — MTBF is a statistical average, not a guaranteed minimum lifetime.</p><h3>Why does redundancy sometimes barely help?</h3><p>A shared single point of failure across "redundant" blocks caps the achievable system reliability.</p>`,
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      keywords: 'no chart invalid calculation import fails export missing',
      html: `<h2>Troubleshooting</h2><table><thead><tr><th>Symptom</th><th>Likely cause</th><th>Action</th></tr></thead><tbody><tr><td>No chart</td><td>No calculation run yet, or Chart.js failed to load.</td><td>Run a calculation; check network/CDN access.</td></tr><tr><td>Invalid inputs</td><td>Zero/negative quantity or FIT, out-of-range temperature.</td><td>Correct the message shown above the workspace.</td></tr><tr><td>CSV import fails</td><td>Missing or malformed columns.</td><td>Use the component/quantity/base_fit column order from Export CSV.</td></tr><tr><td>Export missing</td><td>No calculation run, or browser blocked the download.</td><td>Calculate first and allow downloads for this site.</td></tr></tbody></table>`,
    },
    {
      id: 'concepts',
      title: 'Engineering Concepts',
      keywords: 'MTBF FIT bathtub curve reliability availability redundancy derating',
      html: `<h2>Engineering Concepts</h2><h3>What is MTBF?</h3><p>The average time between failures of a repairable system in its useful-life period.</p><h3>Bathtub curve</h3><p>Failure rate typically follows infant mortality, useful life (constant rate), then wearout phases.</p><h3>Derating</h3><p>Operating parts below rated stress extends life and lowers failure rate — a key lever for improving MTBF.</p><h3>Redundancy</h3><p>Parallel or standby redundant blocks can substantially raise system reliability above any single component.</p>`,
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      keywords: 'keyboard ctrl enter save print escape F1',
      html: `<h2>Keyboard Shortcuts</h2><table><tbody><tr><th>Ctrl + Enter</th><td>Run calculation.</td></tr><tr><th>Ctrl + P</th><td>Print the report when results exist.</td></tr><tr><th>Esc</th><td>Close Help or end the feature tour.</td></tr><tr><th>F1</th><td>Open Help.</td></tr></tbody></table>`,
    },
    {
      id: 'glossary',
      title: 'Glossary',
      keywords: 'definitions MTBF MTTF FIT lambda reliability availability',
      html: `<h2>Glossary</h2><dl><h3>MTBF</h3><p>Mean Time Between Failures.</p><h3>MTTF</h3><p>Mean Time To Failure, for non-repairable items.</p><h3>FIT</h3><p>Failures In Time — failures per 10^9 device-hours.</p><h3>λ (lambda)</h3><p>Failure rate in failures per hour.</p><h3>R(t)</h3><p>Reliability function — probability of survival through time t.</p><h3>Availability</h3><p>Fraction of time a repairable system is operational.</p></dl>`,
    },
  ];
  const dialog = $('help-dialog'),
    nav = $('help-nav'),
    content = $('help-content'),
    search = $('help-search');
  let active = 'getting-started',
    lastFocus = null,
    tourIndex = 0;
  function renderNav(filter = '') {
    const q = filter.trim().toLowerCase(),
      matches = topics.filter(t =>
        (t.title + ' ' + t.keywords + ' ' + t.html.replace(/<[^>]+>/g, ' '))
          .toLowerCase()
          .includes(q)
      );
    nav.innerHTML = matches.length
      ? matches
          .map(
            t =>
              `<button data-help-id="${t.id}" class="${t.id === active ? 'active' : ''}">${t.title}</button>`
          )
          .join('')
      : '<div class="help-no-results">No matching topics. Try a broader term.</div>';
    $('help-search-status').textContent = q
      ? matches.length + ' topic' + (matches.length === 1 ? '' : 's') + ' found'
      : '';
    if (q && matches.length && !matches.some(t => t.id === active)) showTopic(matches[0].id, false);
  }
  function showTopic(id, focus = true) {
    const t = topics.find(x => x.id === id) || topics[0];
    active = t.id;
    content.innerHTML = t.html;
    renderNav(search.value);
    if (focus) content.focus();
  }
  function openHelp(topic) {
    lastFocus = document.activeElement;
    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
    search.value = '';
    showTopic(topic || active, false);
    setTimeout(() => search.focus(), 0);
  }
  function closeHelp() {
    dialog.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  }
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-help-open]');
    if (open) openHelp();
    const tip = e.target.closest('[data-help-topic]');
    if (tip) openHelp(tip.dataset.helpTopic);
    if (e.target.closest('[data-help-close]')) closeHelp();
    const topic = e.target.closest('[data-help-id]');
    if (topic) showTopic(topic.dataset.helpId);
    if (e.target === dialog) closeHelp();
  });
  search.addEventListener('input', () => renderNav(search.value));

  const tour = [
    {
      selector: '.mtbf-hero',
      title: 'Welcome to the MTBF & Reliability Calculator',
      text: 'This guided tour covers the workflow. You can restart it at any time from Help.',
    },
    {
      selector: '#tour-conditions',
      title: '1. Set the standard and conditions',
      text: 'Choose a prediction standard, environment, operating temperature, mission time, confidence level, and MTTR. These drive every downstream calculation.',
    },
    {
      selector: '#tour-components',
      title: '2. Build the component list',
      text: 'Add parts from the built-in FIT library, add custom rows, or import a CSV. Calculated FIT updates live as global conditions change.',
    },
    {
      selector: '#tour-blockdiagram',
      title: '3. Model system topology',
      text: 'Configure a series, parallel, or mixed reliability block diagram to see how redundancy affects system-level reliability.',
    },
    {
      selector: '#tour-whatif',
      title: '4. Explore what-if scenarios',
      text: 'Quick-adjust temperature, quantity, FIT, and mission time, or apply a canned design-improvement preset to see the MTBF and reliability delta.',
    },
    {
      selector: '#tour-results',
      title: '5. Review the results',
      text: 'MTBF, failure rate, reliability, and availability are summarized here alongside five charts covering reliability over time, standards comparison, contribution, and Pareto analysis.',
    },
    {
      selector: '[data-tour-chart]',
      title: 'Explore the reliability chart',
      text: 'The reliability curve shows R(t) decaying over time based on the calculated failure rate.',
    },
    {
      selector: '#tour-export',
      title: 'Save and communicate',
      text: 'Export a CSV or JSON report, save/load configurations, and print a review-ready report.',
    },
  ];
  function positionTour(el) {
    const pop = $('tour-popover'),
      r = el.getBoundingClientRect(),
      w = Math.min(380, window.innerWidth - 32),
      left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left)),
      below = r.bottom + 16,
      top = below + 250 < window.innerHeight ? below : Math.max(16, r.top - 260);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function showTourStep() {
    document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
    const step = tour[tourIndex],
      el = document.querySelector(step.selector);
    if (!el) {
      finishTour();
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('tour-highlight');
    $('tour-progress').textContent = `Step ${tourIndex + 1} of ${tour.length}`;
    $('tour-title').textContent = step.title;
    $('tour-text').textContent = step.text;
    $('tour-prev').disabled = tourIndex === 0;
    $('tour-next').textContent = tourIndex === tour.length - 1 ? 'Finish' : 'Next';
    setTimeout(() => positionTour(el), 250);
  }
  function startTour() {
    closeHelp();
    tourIndex = 0;
    $('tour-backdrop').hidden = false;
    $('tour-popover').hidden = false;
    document.body.style.overflow = '';
    showTourStep();
  }
  function finishTour() {
    document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
    $('tour-backdrop').hidden = true;
    $('tour-popover').hidden = true;
    localStorage.setItem('mtbf_help_tour_complete', '1');
  }
  $('help-start-tour').addEventListener('click', startTour);
  $('tour-next').addEventListener('click', () => {
    if (tourIndex < tour.length - 1) {
      tourIndex++;
      showTourStep();
    } else finishTour();
  });
  $('tour-prev').addEventListener('click', () => {
    if (tourIndex > 0) {
      tourIndex--;
      showTourStep();
    }
  });
  $('tour-skip').addEventListener('click', finishTour);
  window.addEventListener('resize', () => {
    if (!$('tour-popover').hidden) {
      const el = document.querySelector(tour[tourIndex].selector);
      if (el) positionTour(el);
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!dialog.hidden) closeHelp();
      else if (!$('tour-popover').hidden) finishTour();
    }
    if (e.key === 'Tab' && !dialog.hidden) {
      const focusable = [...dialog.querySelectorAll('button,a[href],input,[tabindex="0"]')].filter(
        el => !el.disabled && el.offsetParent !== null
      );
      if (focusable.length) {
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    if (e.key === 'F1') {
      e.preventDefault();
      openHelp();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      document.querySelector('[data-action="calculate"]')?.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && dialog.hidden) {
      e.preventDefault();
      document.querySelector('[data-action="print"]')?.click();
    }
  });
  renderNav();
  showTopic(active, false);
  if (!localStorage.getItem('mtbf_help_tour_complete')) setTimeout(startTour, 900);
})();
