const { Client } = require('pg');
const client = new Client({ host: 'iot666.ddns.net', port: 5435, user: 'realaids', password: 'realaids1234', database: 'ruts_realaids' });

(async () => {
  await client.connect();

  const tablesRes = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const viewsRes = await client.query("SELECT viewname FROM pg_views WHERE schemaname='public' ORDER BY viewname");
  const enumRes = await client.query("SELECT t.typname AS enum_name FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' ORDER BY t.typname");

  console.log('TABLES_COUNT=' + tablesRes.rows.length);
  for (const r of tablesRes.rows) {
    const name = r.tablename;
    const cntRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM public.${name}`);
    console.log(`TABLE|${name}|${cntRes.rows[0].cnt}`);
  }

  console.log('VIEWS_COUNT=' + viewsRes.rows.length);
  for (const r of viewsRes.rows) {
    const name = r.viewname;
    const cntRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM public.${name}`);
    console.log(`VIEW|${name}|${cntRes.rows[0].cnt}`);
  }

  console.log('ENUMS_COUNT=' + enumRes.rows.length);
  for (const r of enumRes.rows) {
    const name = r.enum_name;
    const valsRes = await client.query("SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname=$1 ORDER BY e.enumsortorder", [name]);
    console.log(`ENUM|${name}|${valsRes.rows.map(x => x.enumlabel).join(',')}`);
  }

  await client.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
