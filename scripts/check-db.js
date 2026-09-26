/* eslint-disable no-console */
/**
 * DB connectivity + WHDC schema check.
 * Loads .env (like the server) and reports whether the database is reachable
 * and whether the Weekly Hardware Design Challenge tables exist.
 *
 * Usage:  node scripts/check-db.js
 */
try {
  require('dotenv').config();
} catch (e) {
  /* dotenv optional — DATABASE_URL may already be in the environment */
}

const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ DATABASE_URL is not set (not in the environment and not found in .env).');
  process.exit(1);
}

// Show host only (never print the password)
try {
  const u = new URL(url);
  console.log(`Target: ${u.username}@${u.host}${u.pathname}`);
} catch (e) {
  console.log('Target: (could not parse DATABASE_URL)');
}

const db = new Pool({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
});

const WHDC_TABLES = [
  'challenges',
  'challenge_questions',
  'challenge_attempts',
  'attempt_answers',
  'user_points',
  'points_ledger',
  'badges',
  'user_badges',
];

(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✓ Database connection OK');
  } catch (e) {
    console.error('✗ Database connection FAILED:', e.message);
    console.error('  → Usually a stale/rotated Neon password. Refresh DATABASE_URL in .env.');
    process.exit(2);
  }

  try {
    const { rows } = await db.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_name = ANY($1)`,
      [WHDC_TABLES]
    );
    const found = rows.map(r => r.table_name);
    const missing = WHDC_TABLES.filter(t => !found.includes(t));
    console.log(`✓ WHDC tables present: ${found.length}/${WHDC_TABLES.length}`);
    if (missing.length) {
      console.log(`  Missing: ${missing.join(', ')}`);
      console.log('  → Start the server once (npm start) so initDB() creates them.');
    } else {
      const ch = await db.query(`SELECT COUNT(*)::int AS n FROM challenges`);
      const q = await db.query(`SELECT COUNT(*)::int AS n FROM challenge_questions`);
      const live = await db.query(`SELECT COUNT(*)::int AS n FROM challenges WHERE status='live'`);
      console.log(
        `  challenges: ${ch.rows[0].n} (live: ${live.rows[0].n}) · questions: ${q.rows[0].n}`
      );
      if (ch.rows[0].n === 0) console.log('  → No challenges yet. Run: node scripts/seed-whdc.js');
    }
  } catch (e) {
    console.error('✗ Schema check error:', e.message);
  } finally {
    await db.end();
  }
})();
