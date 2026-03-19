/**
 * Set all student passwords to their student_id (12-digit).
 * Also activates all inactive students.
 * Run: node scripts/set-student-passwords.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ruts_realaids',
  user: process.env.DATABASE_USER || 'realaids',
  password: process.env.DATABASE_PASSWORD || 'realaids1234',
});

async function main() {
  const client = await pool.connect();
  try {
    const { rows: students } = await client.query(
      `SELECT id, student_id, email FROM users WHERE role = 'student' AND student_id IS NOT NULL`
    );

    console.log(`Found ${students.length} students with student_id`);

    let updated = 0;
    for (const student of students) {
      const hash = await bcrypt.hash(student.student_id, 10);
      await client.query(
        `UPDATE users SET password_hash = $1, is_active = true WHERE id = $2`,
        [hash, student.id]
      );
      updated++;
      if (updated % 10 === 0) process.stdout.write(`\rUpdated ${updated}/${students.length}...`);
    }

    console.log(`\nDone! Updated ${updated} students.`);
    console.log('Initial password for each student = their student_id (12 digits)');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
