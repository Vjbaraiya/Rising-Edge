'use strict';
/**
 * Global Jest setup — runs before every test file.
 * Sets environment variables so server.js can be required without crashing.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-must-be-32-chars!!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.PORT = '0'; // random port; supertest ignores it
process.env.CASHFREE_ENV = 'sandbox';
process.env.APP_URL = 'http://localhost:8080';
