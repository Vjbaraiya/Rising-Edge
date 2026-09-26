/* eslint-disable no-console */
/**
 * Remove Weekly Hardware Design Challenge data from the database.
 * Deletes rows only — the tables themselves are left in place.
 *
 * By default it clears all challenge content and player progress:
 *   challenges, challenge_questions, challenge_attempts, attempt_answers,
 *   user_points, points_ledger, user_badges, and WHDC certificates
 *   (certificate_issues WHERE source='whdc').
 *
 * The badge *catalog* (badges table = the definitions seeded by initDB) is kept,
 * since it is configuration, not dummy data. Pass --badges to wipe it too.
 *
 * Usage:
 *   node scripts/clear-whdc.js            # clear data, keep badge definitions
 *   node scripts/clear-whdc.js --badges   # also clear the badges catalog
 *   node scripts/clear-whdc.js --yes      # skip the confirmation prompt
 */
try {
  require('dotenv').config();
} catch (e) {
  /* dotenv optional */
}

const readline = require('readline');
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ DATABASE_URL is not set (env or .env).');
  process.exit(1);
}

const alsoBadges = process.argv.includes('--badges');
const skipPrompt = process.argv.includes('--yes') || process.argv.includes('-y');

const db = new Pool({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
});

// FK-safe order (children before parents). certificate_issues filtered to WHDC.
const STEPS = [
  ['attempt_answers', 'DELETE FROM attempt_answers'],
  ['challenge_attempts', 'DELETE FROM challenge_attempts'],
  ['points_ledger', 'DELETE FROM points_ledger'],
  ['user_badges', 'DELETE FROM user_badges'],
  ['user_points', 'DELETE FROM user_points'],
  ['challenge_questions', 'DELETE FROM challenge_questions'],
  ['challenges', 'DELETE FROM challenges'],
  ["certificate_issues (source='whdc')", "DELETE FROM certificate_issues WHERE source = 'whdc'"],
];
if (alsoBadges) STEPS.push(['badges (catalog)', 'DELETE FROM badges']);

async function run() {
  try {
    const u = new URL(url);
    console.log(`Target: ${u.username}@${u.host}${u.pathname}`);
  } catch (e) {
    /* ignore */
  }

  // Show what would be removed
  try {
    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM challenges)::int          AS challenges,
        (SELECT COUNT(*) FROM challenge_questions)::int  AS questions,
        (SELECT COUNT(*) FROM challenge_attempts)::int   AS attempts
    `);
    const c = counts.rows[0];
    console.log(
      `About to delete: ${c.challenges} challenge(s), ${c.questions} question(s), ${c.attempts} attempt(s)` +
        (alsoBadges ? ' + badge catalog' : '') +
        ', plus all points/ledger/badges/WHDC certificates.'
    );
    if (c.challenges === 0 && c.questions === 0 && c.attempts === 0 && !alsoBadges) {
      console.log('Nothing to clear — challenge data is already empty.');
      await db.end();
      return;
    }
  } catch (e) {
    console.error('✗ Could not read tables (do they exist / is the DB reachable?):', e.message);
    await db.end();
    process.exit(2);
  }

  if (!skipPrompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(res =>
      rl.question('Type "yes" to permanently delete this data: ', res)
    );
    rl.close();
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted — nothing was deleted.');
      await db.end();
      return;
    }
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const [label, sql] of STEPS) {
      const r = await client.query(sql);
      console.log(`  cleared ${label}: ${r.rowCount} row(s)`);
    }
    await client.query('COMMIT');
    console.log('✓ Done. Challenge data removed (tables kept).');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('✗ Failed, rolled back — nothing was deleted:', e.message);
    process.exitCode = 3;
  } finally {
    client.release();
    await db.end();
  }
}

run();
