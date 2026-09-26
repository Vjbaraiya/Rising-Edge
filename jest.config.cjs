'use strict';
/** @type {import('jest').Config} */
module.exports = {
  // ── Test discovery ──────────────────────────────────────────────────────
  testMatch: ['<rootDir>/tests/unit/**/*.test.js', '<rootDir>/tests/api/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],

  // ── Environment ─────────────────────────────────────────────────────────
  // Default: Node (for API/unit tests). Individual files can override with
  // @jest-environment jsdom in a docblock.
  testEnvironment: 'node',

  // ── Module mocks ────────────────────────────────────────────────────────
  // __mocks__/pg.js is auto-used when tests call jest.mock('pg')
  roots: ['<rootDir>'],

  // ── Setup ───────────────────────────────────────────────────────────────
  setupFiles: ['<rootDir>/tests/setup.js'],

  // ── Coverage ────────────────────────────────────────────────────────────
  collectCoverageFrom: ['lib/**/*.js', 'server.js', '!node_modules/**', '!tests/**'],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    },
    // Higher bar for the pure utility library
    './lib/planUtils.js': {
      lines: 95,
      functions: 95,
      branches: 90,
      statements: 95,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',

  // ── Timeouts ────────────────────────────────────────────────────────────
  testTimeout: 15000,

  // ── Verbosity ───────────────────────────────────────────────────────────
  verbose: true,
};
