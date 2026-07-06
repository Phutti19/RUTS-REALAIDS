const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  host: 'iot666.ddns.net',
  port: 5435,
  user: 'realaids',
  password: 'realaids1234',
  database: 'ruts_realaids'
});

(async () => {
  await client.connect();

  const enumRows = (await client.query(`
    SELECT t.typname AS enum_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname
  `)).rows;

  const enumStatements = [];
  for (const row of enumRows) {
    const values = (await client.query(`
      SELECT enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = $1
      ORDER BY e.enumsortorder
    `, [row.enum_name])).rows;

    const labels = values.map(v => `'${String(v.enumlabel).replace(/'/g, "''")}'`).join(', ');
    enumStatements.push(`CREATE TYPE public.${row.enum_name} AS ENUM (${labels});`);
  }

  const viewRows = (await client.query(`
    SELECT viewname
    FROM pg_views
    WHERE schemaname = 'public'
    ORDER BY viewname
  `)).rows;

  const viewStatements = [];
  for (const row of viewRows) {
    const def = (await client.query(`
      SELECT pg_get_viewdef(to_regclass($1)::oid, true) AS definition
    `, [`public.${row.viewname}`])).rows[0]?.definition;

    if (def) {
      viewStatements.push(`CREATE OR REPLACE VIEW public.${row.viewname} AS\n${def};`);
    }
  }

  const output = [
    '-- Generated from current PostgreSQL database',
    '-- Enum types and views for DBeaver / recreation',
    '',
    ...enumStatements,
    '',
    ...viewStatements,
    ''
  ].join('\n');

  const outPath = path.resolve(__dirname, 'database', 'enum-and-views.sql');
  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`Wrote ${outPath}`);
  await client.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
