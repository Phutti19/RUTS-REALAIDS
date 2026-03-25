#!/usr/bin/env node
/**
 * Performance Test Suite — RUTS REALAIDS
 * Measures: response times, throughput, concurrent connections
 * Run: node docs/test-performance.js  (backend must be running on port 4000, API test must have been run first)
 */
'use strict';

const BASE = 'http://localhost:4000/api/v1';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.data?.accessToken ?? null;
}

async function measure(name, fn, iterations = 1) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] || max;
  return { name, avg: avg.toFixed(1), min: min.toFixed(1), max: max.toFixed(1), p95: p95.toFixed(1), iterations };
}

async function measureConcurrent(name, fn, concurrency) {
  const start = performance.now();
  const promises = Array.from({ length: concurrency }, () => fn());
  const results = await Promise.allSettled(promises);
  const elapsed = performance.now() - start;
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  return { name, concurrency, elapsed: elapsed.toFixed(1), succeeded, failed, rps: (concurrency / (elapsed / 1000)).toFixed(1) };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  RUTS-REALAIDS Performance Test Suite');
  console.log(`    Base URL : ${BASE}`);
  console.log('═'.repeat(70));

  // Login
  const staffToken = await login('nurse@ruts.ac.th', 'Nurse@1234');
  const studentToken = await login('student@ruts.ac.th', 'Student@1234');
  const adminToken = await login('admin@ruts.ac.th', 'Admin@1234');

  if (!staffToken || !studentToken || !adminToken) {
    console.error('❌ Login failed. Run test-api.js first to create test accounts.');
    process.exit(1);
  }
  console.log('✅ Logged in: admin, staff, student\n');

  const headers = (token) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  });

  // ── 1. API Response Time Tests (10 iterations each) ────────────────────────
  console.log('═'.repeat(70));
  console.log('  1. API Response Time (ms) — 10 iterations per endpoint');
  console.log('═'.repeat(70));

  const N = 10;
  const responseTests = [];

  responseTests.push(await measure('GET  /health (no auth)', async () => {
    await fetch(`${BASE.replace('/api/v1', '')}/api/v1/health`);
  }, N));

  responseTests.push(await measure('POST /auth/login', async () => {
    await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@ruts.ac.th', password: 'Student@1234' }),
    });
  }, N));

  responseTests.push(await measure('GET  /users/me', async () => {
    await fetch(`${BASE}/users/me`, { headers: headers(studentToken) });
  }, N));

  responseTests.push(await measure('GET  /incidents (staff)', async () => {
    await fetch(`${BASE}/incidents?page=1&limit=20`, { headers: headers(staffToken) });
  }, N));

  responseTests.push(await measure('GET  /incidents/:id (detail)', async () => {
    // Get first incident
    const list = await fetch(`${BASE}/incidents?page=1&limit=1`, { headers: headers(staffToken) });
    const data = await list.json();
    if (data.data?.[0]?.id) {
      await fetch(`${BASE}/incidents/${data.data[0].id}`, { headers: headers(staffToken) });
    }
  }, N));

  responseTests.push(await measure('GET  /visits/queue', async () => {
    await fetch(`${BASE}/visits/queue`, { headers: headers(staffToken) });
  }, N));

  responseTests.push(await measure('GET  /medicines (list)', async () => {
    await fetch(`${BASE}/medicines?page=1&limit=20`, { headers: headers(staffToken) });
  }, N));

  responseTests.push(await measure('GET  /appointments/today', async () => {
    await fetch(`${BASE}/appointments/today`, { headers: headers(staffToken) });
  }, N));

  responseTests.push(await measure('GET  /reports/dashboard', async () => {
    await fetch(`${BASE}/reports/dashboard`, { headers: headers(staffToken) });
  }, N));

  responseTests.push(await measure('GET  /notifications', async () => {
    await fetch(`${BASE}/notifications?page=1&limit=20`, { headers: headers(studentToken) });
  }, N));

  responseTests.push(await measure('GET  /settings (admin)', async () => {
    await fetch(`${BASE}/settings`, { headers: headers(adminToken) });
  }, N));

  responseTests.push(await measure('GET  /reports/export/pdf', async () => {
    await fetch(`${BASE}/reports/export/pdf?type=daily&date=2026-03-24`, { headers: headers(staffToken) });
  }, N));

  // Print table
  console.log(`\n  ${'Endpoint'.padEnd(38)} ${'Avg'.padStart(8)} ${'Min'.padStart(8)} ${'Max'.padStart(8)} ${'P95'.padStart(8)}`);
  console.log('  ' + '─'.repeat(70));
  for (const r of responseTests) {
    console.log(`  ${r.name.padEnd(38)} ${(r.avg + 'ms').padStart(8)} ${(r.min + 'ms').padStart(8)} ${(r.max + 'ms').padStart(8)} ${(r.p95 + 'ms').padStart(8)}`);
  }

  // ── 2. Concurrent Request Tests ────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('  2. Concurrent Request Handling');
  console.log('═'.repeat(70));

  const concTests = [];

  concTests.push(await measureConcurrent('10 concurrent GET /incidents', async () => {
    const r = await fetch(`${BASE}/incidents?page=1&limit=10`, { headers: headers(staffToken) });
    if (!r.ok) throw new Error(`${r.status}`);
  }, 10));

  concTests.push(await measureConcurrent('20 concurrent GET /medicines', async () => {
    const r = await fetch(`${BASE}/medicines?page=1&limit=20`, { headers: headers(staffToken) });
    if (!r.ok) throw new Error(`${r.status}`);
  }, 20));

  concTests.push(await measureConcurrent('10 concurrent GET /reports/dashboard', async () => {
    const r = await fetch(`${BASE}/reports/dashboard`, { headers: headers(staffToken) });
    if (!r.ok) throw new Error(`${r.status}`);
  }, 10));

  concTests.push(await measureConcurrent('20 concurrent GET /notifications', async () => {
    const r = await fetch(`${BASE}/notifications?page=1&limit=20`, { headers: headers(studentToken) });
    if (!r.ok) throw new Error(`${r.status}`);
  }, 20));

  concTests.push(await measureConcurrent('50 concurrent GET /health', async () => {
    const r = await fetch(`${BASE.replace('/api/v1', '')}/api/v1/health`);
    if (!r.ok) throw new Error(`${r.status}`);
  }, 50));

  console.log(`\n  ${'Test'.padEnd(42)} ${'Conc'.padStart(5)} ${'Time'.padStart(10)} ${'OK'.padStart(5)} ${'Fail'.padStart(5)} ${'RPS'.padStart(8)}`);
  console.log('  ' + '─'.repeat(75));
  for (const r of concTests) {
    console.log(`  ${r.name.padEnd(42)} ${String(r.concurrency).padStart(5)} ${(r.elapsed + 'ms').padStart(10)} ${String(r.succeeded).padStart(5)} ${String(r.failed).padStart(5)} ${(r.rps + '/s').padStart(8)}`);
  }

  // ── 3. Database Query Performance ──────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('  3. Complex Query Performance (single request, ms)');
  console.log('═'.repeat(70));

  const dbTests = [];

  dbTests.push(await measure('Dashboard aggregation', async () => {
    await fetch(`${BASE}/reports/dashboard`, { headers: headers(staffToken) });
  }, 5));

  dbTests.push(await measure('Incident stats (30 days)', async () => {
    const from = '2026-02-22';
    const to = '2026-03-24';
    await fetch(`${BASE}/reports/incidents?from=${from}&to=${to}`, { headers: headers(staffToken) });
  }, 5));

  dbTests.push(await measure('Visit stats (30 days)', async () => {
    const from = '2026-02-22';
    const to = '2026-03-24';
    await fetch(`${BASE}/reports/visits?from=${from}&to=${to}`, { headers: headers(staffToken) });
  }, 5));

  dbTests.push(await measure('PDF report generation', async () => {
    await fetch(`${BASE}/reports/export/pdf?type=daily&date=2026-03-24`, { headers: headers(staffToken) });
  }, 5));

  dbTests.push(await measure('Medicine low stock alerts', async () => {
    await fetch(`${BASE}/medicines/alerts/low-stock`, { headers: headers(staffToken) });
  }, 5));

  console.log(`\n  ${'Query'.padEnd(38)} ${'Avg'.padStart(8)} ${'Min'.padStart(8)} ${'Max'.padStart(8)}`);
  console.log('  ' + '─'.repeat(62));
  for (const r of dbTests) {
    console.log(`  ${r.name.padEnd(38)} ${(r.avg + 'ms').padStart(8)} ${(r.min + 'ms').padStart(8)} ${(r.max + 'ms').padStart(8)}`);
  }

  // ── 4. Authentication Performance ──────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('  4. Authentication Performance');
  console.log('═'.repeat(70));

  const authTests = [];

  authTests.push(await measure('Login (bcrypt verify)', async () => {
    await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@ruts.ac.th', password: 'Student@1234' }),
    });
  }, 5));

  authTests.push(await measure('JWT token verification', async () => {
    await fetch(`${BASE}/users/me`, { headers: headers(studentToken) });
  }, 10));

  authTests.push(await measure('Token refresh', async () => {
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@ruts.ac.th', password: 'Student@1234' }),
    });
    const loginData = await loginRes.json();
    const rt = loginData.data?.refreshToken;
    if (rt) {
      await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
    }
  }, 5));

  console.log(`\n  ${'Operation'.padEnd(38)} ${'Avg'.padStart(8)} ${'Min'.padStart(8)} ${'Max'.padStart(8)}`);
  console.log('  ' + '─'.repeat(62));
  for (const r of authTests) {
    console.log(`  ${r.name.padEnd(38)} ${(r.avg + 'ms').padStart(8)} ${(r.min + 'ms').padStart(8)} ${(r.max + 'ms').padStart(8)}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('  PERFORMANCE SUMMARY');
  console.log('═'.repeat(70));

  const allAvgs = responseTests.map(r => parseFloat(r.avg));
  const overallAvg = (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(1);
  const fastestEndpoint = responseTests.reduce((a, b) => parseFloat(a.avg) < parseFloat(b.avg) ? a : b);
  const slowestEndpoint = responseTests.reduce((a, b) => parseFloat(a.avg) > parseFloat(b.avg) ? a : b);
  const under200ms = responseTests.filter(r => parseFloat(r.avg) < 200).length;
  const under500ms = responseTests.filter(r => parseFloat(r.avg) < 500).length;

  console.log(`\n  Endpoints tested     : ${responseTests.length}`);
  console.log(`  Average response     : ${overallAvg} ms`);
  console.log(`  Fastest              : ${fastestEndpoint.name} (${fastestEndpoint.avg} ms)`);
  console.log(`  Slowest              : ${slowestEndpoint.name} (${slowestEndpoint.avg} ms)`);
  console.log(`  Under 200ms          : ${under200ms}/${responseTests.length} (${(under200ms/responseTests.length*100).toFixed(0)}%)`);
  console.log(`  Under 500ms          : ${under500ms}/${responseTests.length} (${(under500ms/responseTests.length*100).toFixed(0)}%)`);
  console.log(`  Max concurrent (OK)  : ${concTests.find(t => t.concurrency === 50)?.succeeded ?? 'N/A'}/50`);
  console.log(`  Peak RPS (health)    : ${concTests.find(t => t.concurrency === 50)?.rps ?? 'N/A'} req/s`);
  console.log('');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
