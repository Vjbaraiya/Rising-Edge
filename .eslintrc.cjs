'use strict';
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'commonjs',
  },
  plugins: ['node'],
  extends: ['eslint:recommended', 'plugin:node/recommended'],
  rules: {
    // Style
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    curly: ['error', 'multi-line'],

    // Node safety
    'node/no-unpublished-require': 'off',
    'node/no-missing-require': 'error',
    'node/no-extraneous-require': 'off',
    'node/no-unsupported-features/es-syntax': ['error', { version: '>=18.0.0' }],

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
  overrides: [
    {
      files: ['tests/unit/**/*.js', 'tests/api/**/*.js'],
      env: { jest: true },
      rules: {
        'no-unused-vars': 'warn',
        'node/no-unpublished-require': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
      },
    },
    {
      files: [
        'tests/unit/core.test.js',
        'tests/unit/audit.test.js',
        'tests/unit/certificate-api.test.js',
        'tests/unit/certificate-renderer.test.js',
      ],
      env: { jest: true, browser: true },
      rules: {
        'no-eval': 'off',
        'no-unused-vars': 'warn',
        'node/no-unpublished-require': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
      },
    },
    {
      files: ['tests/e2e/**/*.js', 'tests/e2e/**/*.spec.js'],
      env: { browser: true },
      rules: {
        'no-unused-vars': 'warn',
        'node/no-unpublished-require': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
        'node/no-missing-require': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    '**/*.html',
  ],
};
