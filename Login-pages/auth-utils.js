/* ══════════════════════════════════════════════════════════════════
   Rising Edge Technologies — Shared Auth Page Utilities
   Applies to: login.html · register.html · forgot-password.html
               · verify-email.html
══════════════════════════════════════════════════════════════════ */

function cycleTheme() {
  var themes = ['dark', 'light', 'night'];
  var cur = localStorage.getItem('re-theme') || 'dark';
  var next = themes[(themes.indexOf(cur) + 1) % themes.length];
  localStorage.setItem('re-theme', next);
  document.documentElement.dataset.theme = next;
}

/**
 * Toggle a password input between text / password.
 * @param {string} inputId  — id of the <input type="password">
 * @param {string} openId   — id of the "eye open" SVG (visible when password is hidden)
 * @param {string} closeId  — id of the "eye closed" SVG (visible when password is shown)
 */
function togglePw(inputId, openId, closeId) {
  var inp = document.getElementById(inputId);
  var isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  document.getElementById(openId).style.display = isText ? '' : 'none';
  document.getElementById(closeId).style.display = isText ? 'none' : '';
}
