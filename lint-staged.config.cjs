'use strict';
module.exports = {
  // JS files — lint + format
  '*.js': ['eslint --fix', 'prettier --write'],
  '*.cjs': ['eslint --fix', 'prettier --write'],

  // HTML/CSS — format only (ESLint doesn't cover HTML inline scripts)
  '*.{html,css}': ['prettier --write'],

  // JSON — format
  '*.json': ['prettier --write'],

  // server.js specifically — also run syntax check
  'server.js': ['node --check'],
  'lib/**/*.js': ['node --check'],
};
