/* eslint-disable no-console */
/**
 * Seed a sample live Weekly Hardware Design Challenge (Week 34 — DDR4 fly-by).
 * Idempotent: safe to run multiple times (keyed on the challenge slug).
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/seed-whdc.js
 *
 * Requires the WHDC tables to exist (they are created by initDB() on server start,
 * or run db/whdc_schema.sql once).
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

const SLUG = 'week-34-ddr4-flyby';

// answer_key convention:
//   mcq / svg      -> { correct: <optionIndex> }
//   multi          -> { correct: [<optionIndex>, ...] }
//   numeric        -> { value: <number> }  (+ numeric_tolerance on the row)
const QUESTIONS = [
  {
    type: 'mcq',
    points: 10,
    topic_tag: 'Write Leveling',
    difficulty_tag: 'Intermediate',
    prompt:
      'In a DDR4 fly-by topology, the command/address/control bus reaches each DRAM sequentially. What compensates for the resulting per-device flight-time skew relative to DQ groups?',
    options: [
      { id: 0, text: 'Adding series termination on every DQ line' },
      {
        id: 1,
        text: 'Write leveling — the controller delays DQS per byte lane to align with CK at each DRAM',
      },
      { id: 2, text: 'Increasing the CK trace width' },
      { id: 3, text: 'Routing all address lines as differential pairs' },
    ],
    answer_key: { correct: 1 },
    explanation:
      'Write leveling delays DQS per byte lane so it aligns with CK at each DRAM, compensating fly-by flight-time skew.',
  },
  {
    type: 'multi',
    points: 10,
    partial_credit: true,
    topic_tag: 'Fly-by Topology',
    difficulty_tag: 'Intermediate',
    prompt:
      'Why did fly-by topology replace the older T-topology for DDR3/DDR4 command/address? (Select all that apply.)',
    options: [
      { id: 0, text: 'Cleaner signal integrity at higher data rates (fewer stubs/reflections)' },
      { id: 1, text: 'It removes the need for any termination' },
      { id: 2, text: 'Simpler, more scalable routing to many DRAMs' },
      { id: 3, text: 'It eliminates the need for write leveling' },
    ],
    answer_key: { correct: [0, 2] },
    explanation:
      'Fly-by reduces stubs (better SI) and scales cleanly. Termination is still required and write leveling is still needed.',
  },
  {
    type: 'numeric',
    points: 10,
    numeric_tolerance: 5,
    topic_tag: 'Timing',
    difficulty_tag: 'Intermediate',
    prompt:
      'A DDR4 interface runs at 3200 MT/s (1600 MHz clock). What is the unit interval (bit period) in picoseconds? (±5 ps)',
    assets: { unit: 'ps' },
    answer_key: { value: 312.5 },
    explanation: '1 / 3.2 GT/s = 312.5 ps per bit.',
  },
  {
    type: 'numeric',
    points: 10,
    numeric_tolerance: 3,
    topic_tag: 'Length Matching',
    difficulty_tag: 'Advanced',
    prompt:
      'Propagation delay is 170 ps/inch. How many mils of length equal a 10 ps skew? (±3 mils)',
    assets: { unit: 'mils' },
    answer_key: { value: 59 },
    explanation: '10 ps ÷ 170 ps/inch = 0.0588 inch ≈ 59 mils.',
  },
  {
    type: 'mcq',
    points: 10,
    topic_tag: 'Reference-Plane Integrity',
    difficulty_tag: 'Advanced',
    prompt:
      'What is the primary SI risk of routing a DDR4 DQ byte lane across a split in the reference plane?',
    options: [
      { id: 0, text: 'Increased DC resistance only' },
      { id: 1, text: 'A return-current discontinuity that raises impedance, crosstalk, and EMI' },
      { id: 2, text: 'The trace becomes an antenna only below 1 MHz' },
      { id: 3, text: 'Nothing — DQ lines are single-ended so the plane is irrelevant' },
    ],
    answer_key: { correct: 1 },
    explanation:
      'The return current cannot follow across a plane split, creating an impedance discontinuity that raises crosstalk and EMI.',
  },
  {
    type: 'svg',
    points: 10,
    topic_tag: 'Reference-Plane Integrity',
    difficulty_tag: 'Intermediate',
    prompt:
      'For a DQ trace and its return path, which routing keeps the return current tightly coupled and the loop area smallest?',
    options: [
      { id: 0, text: 'Signal over a solid reference plane on the adjacent layer' },
      { id: 1, text: 'Signal over a gap in the plane with the nearest return two layers away' },
      { id: 2, text: 'Signal routed with no adjacent plane at all' },
      { id: 3, text: 'Signal over a plane shared with a noisy switching supply' },
    ],
    answer_key: { correct: 0 },
    explanation:
      'A solid adjacent plane keeps the return current tightly coupled and the loop area minimal.',
  },
  {
    type: 'mcq',
    points: 10,
    topic_tag: 'Length Matching',
    difficulty_tag: 'Intermediate',
    prompt: 'Which DQ/DQS length-matching rule is standard practice for DDR4?',
    options: [
      { id: 0, text: 'Match every DQ, DQS, CK and address net to the same absolute length' },
      {
        id: 1,
        text: 'Match DQ bits to their DQS within a byte lane tightly; match byte lanes to CK more loosely',
      },
      { id: 2, text: 'Only DQS pairs must be matched; DQ length is irrelevant' },
      { id: 3, text: 'Match address lines to DQ lines within 1 mil' },
    ],
    answer_key: { correct: 1 },
    explanation: 'DQ bits match their DQS tightly; byte lanes match CK with a looser budget.',
  },
  {
    type: 'mcq',
    points: 10,
    topic_tag: 'Termination',
    difficulty_tag: 'Intermediate',
    prompt: 'Why is VTT termination placed at the far end of the fly-by command/address bus?',
    options: [
      { id: 0, text: 'To supply power to the DRAMs' },
      {
        id: 1,
        text: 'To absorb the wavefront at the end of the daisy chain and prevent reflections back up the bus',
      },
      { id: 2, text: 'To reduce the CK frequency' },
      { id: 3, text: 'To provide ESD protection for the connector' },
    ],
    answer_key: { correct: 1 },
    explanation: 'End termination prevents reflections travelling back up the fly-by bus.',
  },
  {
    type: 'multi',
    points: 10,
    partial_credit: true,
    topic_tag: 'Power Integrity',
    difficulty_tag: 'Advanced',
    prompt:
      'Which measures reduce simultaneous switching noise (SSN) on a DDR4 interface? (Select all that apply.)',
    options: [
      { id: 0, text: 'Adequate decoupling close to the DRAM/controller power pins' },
      { id: 1, text: 'Low-inductance power/ground plane pairs' },
      { id: 2, text: 'Removing all series resistors from DQ lines' },
      { id: 3, text: 'Balanced, tightly-coupled return paths under the byte lanes' },
    ],
    answer_key: { correct: [0, 1, 3] },
    explanation:
      'Decoupling, low-inductance planes, and tight return paths all reduce SSN; removing series R does not.',
  },
  {
    type: 'mcq',
    points: 10,
    topic_tag: 'Bring-up',
    difficulty_tag: 'Advanced',
    prompt:
      'During bring-up the DDR4 link trains at low speed but fails write leveling at 3200 MT/s. Most likely root cause?',
    options: [
      { id: 0, text: 'The DRAM part is counterfeit' },
      {
        id: 1,
        text: 'Excessive CK-to-DQS skew or a reference-plane discontinuity degrading margins at speed',
      },
      { id: 2, text: 'The PCB soldermask color' },
      { id: 3, text: 'Too much decoupling capacitance' },
    ],
    answer_key: { correct: 1 },
    explanation:
      'Marginal timing or a return-path discontinuity degrades margins that only fail at full rate.',
  },
];

async function main() {
  const now = new Date();
  const opens = new Date(now.getTime() - 2 * 86400 * 1000); // opened 2 days ago
  const closes = new Date(now.getTime() + 2 * 86400 * 1000 + 14 * 3600 * 1000); // ~2.5 days left

  // link to Signal Integrity course if present
  const course = await db
    .query(`SELECT id FROM courses WHERE slug='si' OR category='si' LIMIT 1`)
    .catch(() => ({ rows: [] }));
  const courseId = course.rows[0]?.id || null;

  const existing = await db.query(`SELECT id FROM challenges WHERE slug=$1`, [SLUG]);
  let challengeId;
  if (existing.rows.length) {
    challengeId = existing.rows[0].id;
    await db.query(
      `UPDATE challenges SET status='live', opens_at=$2, closes_at=$3, updated_at=NOW() WHERE id=$1`,
      [challengeId, opens, closes]
    );
    await db.query(`DELETE FROM challenge_questions WHERE challenge_id=$1`, [challengeId]);
    console.log('Updated existing challenge', challengeId);
  } else {
    const ins = await db.query(
      `INSERT INTO challenges
         (week_number,title,slug,topic,difficulty,description,time_limit_min,total_points,
          linked_course_id,opens_at,closes_at,status)
       VALUES (34,$1,$2,'Signal Integrity','Intermediate',$3,20,100,$4,$5,$6,'live')
       RETURNING id`,
      [
        'DDR4 Fly-by Routing & Timing',
        SLUG,
        'Ten questions on DDR4 fly-by topology, write leveling, length matching, and reference-plane integrity.',
        courseId,
        opens,
        closes,
      ]
    );
    challengeId = ins.rows[0].id;
    console.log('Created challenge', challengeId);
  }

  let pos = 0;
  for (const q of QUESTIONS) {
    await db.query(
      `INSERT INTO challenge_questions
         (challenge_id,type,prompt,assets,options,answer_key,points,partial_credit,
          numeric_tolerance,topic_tag,difficulty_tag,explanation,position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        challengeId,
        q.type,
        q.prompt,
        q.assets ? JSON.stringify(q.assets) : null,
        q.options ? JSON.stringify(q.options) : null,
        JSON.stringify(q.answer_key),
        q.points || 10,
        !!q.partial_credit,
        q.numeric_tolerance ?? null,
        q.topic_tag || null,
        q.difficulty_tag || null,
        q.explanation || null,
        pos++,
      ]
    );
  }
  console.log(`Seeded ${QUESTIONS.length} questions.`);
  console.log(
    'Done. Open /Challenge/index.html — the live challenge is now backed by the database.'
  );
  await db.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
