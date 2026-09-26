'use strict';
/**
 * Manual Jest mock for the `pg` module.
 * Place this file at <root>/__mocks__/pg.js.
 * Tests call jest.mock('pg') and import mockQuery/mockEnd to configure responses.
 */

const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockRelease = jest.fn();

const mockOn = jest.fn();

// Transaction client: shares the same mockQuery so tests configure both
// pool.query() and client.query() through one place.
const mockClient = { query: mockQuery, release: mockRelease };
const mockConnect = jest.fn().mockResolvedValue(mockClient);

const mockPool = { query: mockQuery, end: mockEnd, on: mockOn, connect: mockConnect };

const Pool = jest.fn(() => mockPool);

module.exports = { Pool };
module.exports.Pool = Pool;
module.exports.mockQuery = mockQuery;
module.exports.mockEnd = mockEnd;
module.exports.mockRelease = mockRelease;
module.exports.mockConnect = mockConnect;
module.exports.mockClient = mockClient;
module.exports.mockPool = mockPool;
