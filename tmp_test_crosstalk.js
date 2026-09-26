const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'Trainings/SI/calc-crosstalk.html'), 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'https://example.com/',
});
const { window } = dom;

window.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {};
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'canvas') return this;
        if (typeof prop === 'string') return noop;
        return undefined;
      },
      set() {
        return true;
      },
    }
  );
};

window.Element.prototype.getBoundingClientRect = function () {
  return { width: 800, height: 350, top: 0, left: 0, right: 800, bottom: 350 };
};

let errors = [];

const scripts = [...dom.window.document.querySelectorAll('script')].filter(s => !s.src);
for (const s of scripts) {
  try {
    dom.window.eval(s.textContent);
  } catch (e) {
    errors.push(e.stack || e.message);
  }
}

console.log('Errors:', errors);
console.log('xt-next-coeff:', dom.window.document.getElementById('xt-next-coeff').textContent);
console.log('xt-fext-coeff:', dom.window.document.getElementById('xt-fext-coeff').textContent);
console.log('xt-sh-ratio:', dom.window.document.getElementById('xt-sh-ratio').textContent);
