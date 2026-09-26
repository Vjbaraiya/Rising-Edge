/* eslint-disable no-console */
/**
 * Seed a sample certificate into certificate_issues so you can test the whole
 * certificate flow end to end (admin list, public verify, user profile).
 * Idempotent: reuses an existing sample cert for the same user if one exists.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/db node scripts/seed-sample-cert.js [email] [courseId]
 *
 * - email    (optional) recipient. Defaults to the first SUPER_ADMIN/ADMIN, else any user.
 * - courseId (optional) course to attach. Defaults to the first course, else none.
 *
 * Prints the generated certificate number and the verification URL.
 */
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL (e.g. postgres://user:pass@host:5432/db) and re-run.');
  process.exit(1);
}
const db = new Pool({
  connectionString: DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
});

const argEmail = (process.argv[2] || '').trim().toLowerCase();
const argCourseId = (process.argv[3] || '').trim();
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

async function main() {
  // 1. Resolve the recipient user.
  let user;
  if (argEmail) {
    const { rows } = await db.query('SELECT id, full_name, email FROM users WHERE email=$1', [
      argEmail,
    ]);
    if (!rows.length) {
      throw new Error('No user found with email ' + argEmail + '. Register that user first.');
    }
    user = rows[0];
  } else {
    const { rows } = await db.query(
      `SELECT id, full_name, email FROM users
        ORDER BY (role IN ('SUPER_ADMIN','ADMIN')) DESC, created_at ASC LIMIT 1`
    );
    if (!rows.length) {
      throw new Error('No users exist yet. Register a user, then re-run.');
    }
    user = rows[0];
  }

  // 2. Resolve a course to attach (optional — course_id may be null).
  let course = null;
  if (argCourseId) {
    const { rows } = await db.query('SELECT id, title FROM courses WHERE id=$1', [argCourseId]);
    if (!rows.length) {
      throw new Error('No course found with id ' + argCourseId + '.');
    }
    course = rows[0];
  } else {
    const { rows } = await db.query(
      'SELECT id, title FROM courses ORDER BY created_at ASC LIMIT 1'
    );
    course = rows.length ? rows[0] : null;
  }

  // 3. Reuse an existing non-revoked sample cert for this user, else insert one.
  const existing = await db.query(
    `SELECT cert_number FROM certificate_issues
      WHERE user_id=$1 AND source='sample' AND revoked=FALSE
      ORDER BY issued_at DESC LIMIT 1`,
    [user.id]
  );
  let certNumber;
  if (existing.rows.length) {
    certNumber = existing.rows[0].cert_number;
    console.log('Reusing existing sample certificate.');
  } else {
    const { rows } = await db.query(
      `INSERT INTO certificate_issues (user_id, course_id, source)
       VALUES ($1, $2, 'sample')
       RETURNING cert_number`,
      [user.id, course ? course.id : null]
    );
    certNumber = rows[0].cert_number;
    console.log('Created a new sample certificate.');
  }

  console.log('');
  console.log('  Recipient : ' + (user.full_name || '(no name)') + ' <' + user.email + '>');
  console.log('  Course    : ' + (course ? course.title : '(none — generic certificate)'));
  console.log('  Cert No.  : ' + certNumber);
  console.log('  Verify    : ' + FRONTEND_URL + '/Certificate/verify.html?id=' + certNumber);
  console.log('  API check : ' + FRONTEND_URL + '/api/v1/certificates/verify/' + certNumber);
  console.log('');
}

main()
  .then(() => db.end())
  .catch(err => {
    console.error('Error:', err.message);
    db.end();
    process.exit(1);
  });
