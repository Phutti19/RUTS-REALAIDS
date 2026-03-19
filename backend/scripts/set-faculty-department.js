/**
 * Set faculty and department for all students based on student_id prefix.
 * Run: node scripts/set-faculty-department.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ruts_realaids',
  user: process.env.DATABASE_USER || 'realaids',
  password: process.env.DATABASE_PASSWORD || 'realaids1234',
});

// Map student_id prefix → { faculty, department }
// Based on RMUTSV (มทร.ศรีวิชัย) actual faculties
const FACULTY_MAP = {
  // คณะวิศวกรรมศาสตร์
  '6701': { faculty: 'คณะวิศวกรรมศาสตร์',                       department: 'วิศวกรรมคอมพิวเตอร์' },
  '6702': { faculty: 'คณะวิศวกรรมศาสตร์',                       department: 'วิศวกรรมไฟฟ้า' },
  '6703': { faculty: 'คณะวิศวกรรมศาสตร์',                       department: 'วิศวกรรมโยธา' },
  '6704': { faculty: 'คณะวิศวกรรมศาสตร์',                       department: 'วิศวกรรมเครื่องกล' },
  // คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี
  '6705': { faculty: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',     department: 'วิศวกรรมเมคคาทรอนิกส์' },
  // คณะบริหารธุรกิจ
  '6706': { faculty: 'คณะบริหารธุรกิจ',                         department: 'การจัดการ' },
  // คณะศิลปศาสตร์
  '6707': { faculty: 'คณะศิลปศาสตร์',                           department: 'การโรงแรมและการท่องเที่ยว' },
  // คณะสถาปัตยกรรมศาสตร์
  '6708': { faculty: 'คณะสถาปัตยกรรมศาสตร์',                    department: 'สถาปัตยกรรม' },
};

async function main() {
  const client = await pool.connect();
  try {
    const { rows: students } = await client.query(
      `SELECT id, student_id FROM users WHERE role = 'student' AND student_id IS NOT NULL`
    );

    console.log(`Found ${students.length} students`);
    let updated = 0;

    for (const student of students) {
      const prefix = student.student_id.substring(0, 4);
      const mapping = FACULTY_MAP[prefix];
      if (!mapping) {
        console.warn(`  No mapping for prefix: ${prefix} (student_id: ${student.student_id})`);
        continue;
      }
      await client.query(
        `UPDATE users SET faculty = $1, department = $2 WHERE id = $3`,
        [mapping.faculty, mapping.department, student.id]
      );
      updated++;
    }

    console.log(`Done! Updated ${updated} students.`);

    // Show summary
    const { rows: summary } = await client.query(
      `SELECT faculty, department, COUNT(*) FROM users WHERE role='student' GROUP BY 1,2 ORDER BY 1,2`
    );
    console.log('\nSummary:');
    summary.forEach(r => console.log(`  ${r.faculty} / ${r.department}: ${r.count} คน`));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
