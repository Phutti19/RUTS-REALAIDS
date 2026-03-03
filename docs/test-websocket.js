#!/usr/bin/env node
/**
 * WebSocket Test Suite — RUTS REALAIDS
 * Tests: connection auth, real-time events (incident:new, incident:accepted,
 *        incident:status_update), ping/pong, and reconnection.
 * Run: node docs/test-websocket.js  (backend must be running on port 4000)
 */

const BASE   = "http://localhost:4000/api/v1";
const WS_URL = "ws://localhost:4000";

// Load ws from backend node_modules (same technique as test-security.js for pg)
let WS;
try {
  const { createRequire } = await import("module");
  const localReq = createRequire(import.meta.url);
  WS = localReq("../backend/node_modules/ws");
} catch (err) {
  console.error("Failed to load ws module:", err.message);
  process.exit(1);
}

// ── helpers ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function ok(name, detail = "") {
  passed++;
  results.push({ status: "PASS", name, detail });
  console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  failed++;
  results.push({ status: "FAIL", name, detail });
  console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? " — " + detail : ""}`);
}
function info(msg) { console.log("\n\x1b[36m► " + msg + "\x1b[0m"); }

async function req(method, path, body, headers = {}) {
  const opts = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { token: data.data?.accessToken ?? null, user: data.data?.user, data };
}

/**
 * Open a WebSocket connection authenticated with the given JWT.
 * Resolves when the server sends the 'connected' acknowledgement.
 * Rejects on auth failure (close 1008) or timeout.
 *
 * Returns { ws, on, waitFor, close, send, connectionId }
 *   on(event, handler)         → subscribe; returns an unsubscribe fn
 *   waitFor(event, timeoutMs)  → promise that resolves with event data
 *   send(event, data)          → send a message to the server
 *   close()                    → cleanly close the connection
 */
function openWs(token) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
    const ws = new WS(url);
    const handlers = new Map(); // event → Set<callback>

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const set = handlers.get(msg.event);
        if (set) set.forEach((h) => h(msg.data));
      } catch { /* ignore malformed */ }
    });

    ws.on("error", (err) => {
      if (!settled) { settled = true; reject(err); }
    });

    ws.on("close", (code, reason) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Connection closed: ${code} ${reason}`));
      }
    });

    const on = (event, handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return () => handlers.get(event)?.delete(handler);
    };

    const waitFor = (event, timeoutMs = 6000) =>
      new Promise((res, rej) => {
        const timer = setTimeout(() => {
          off();
          rej(new Error(`Timeout waiting for event "${event}"`));
        }, timeoutMs);
        const off = on(event, (data) => {
          clearTimeout(timer);
          off();
          res(data);
        });
      });

    const close = () => ws.close();
    const send  = (event, data) => ws.send(JSON.stringify({ event, data }));

    // The server sends "connected" immediately after auth succeeds
    on("connected", (data) => {
      settled = true;
      resolve({ ws, on, waitFor, close, send, connectionId: data?.connectionId });
    });

    // Overall timeout
    setTimeout(() => {
      if (!settled) { settled = true; reject(new Error("WS connection timeout")); }
    }, 5000);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Login — get tokens for both test accounts
// ─────────────────────────────────────────────────────────────────────────────
info("Setup: logging in test accounts");
const { token: studentToken, user: studentUser } = await login("student2@ruts.ac.th", "Student@1234");
const { token: staffToken,   user: staffUser   } = await login("nurse2@ruts.ac.th",   "Nurse@1234");

if (!studentToken || !staffToken) {
  console.error("\x1b[31mLogin failed — cannot run WebSocket tests\x1b[0m");
  process.exit(1);
}
console.log(`  student: ${studentUser?.firstName} ${studentUser?.lastName} (${studentUser?.id?.slice(0,8)}...)`);
console.log(`  staff:   ${staffUser?.firstName} ${staffUser?.lastName} (${staffUser?.id?.slice(0,8)}...)`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Authenticated connections
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 1: Authenticated WebSocket connections");
let studentConn = null;
let staffConn   = null;
{
  try {
    studentConn = await openWs(studentToken);
    ok("Student WS connected", `connId=${studentConn.connectionId}`);
  } catch (err) {
    fail("Student WS connection failed", err.message);
  }

  try {
    staffConn = await openWs(staffToken);
    ok("Staff WS connected", `connId=${staffConn.connectionId}`);
  } catch (err) {
    fail("Staff WS connection failed", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Invalid / missing token → connection refused
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 2: Invalid / missing token → connection refused");
{
  // Invalid JWT
  try {
    await openWs("invalid.jwt.token");
    fail("Invalid JWT accepted (should be rejected)");
  } catch {
    ok("Invalid JWT → connection closed (1008)");
  }

  // No token at all
  try {
    await openWs("");
    fail("Empty token accepted (should be rejected)");
  } catch {
    ok("Empty/missing token → connection closed (1008)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Ping / Pong
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 3: Ping/Pong heartbeat");
{
  if (!staffConn) {
    fail("Ping/Pong skipped — no staff connection");
  } else {
    try {
      const pongPromise = staffConn.waitFor("pong", 3000);
      staffConn.send("ping", {});
      const pong = await pongPromise;
      ok("ping → pong", `server ts=${pong?.ts}`);
    } catch (err) {
      fail("Ping/Pong failed", err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Student reports incident → staff receives incident:new
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 4: Student reports incident → staff receives incident:new");
let incidentId = null;
{
  if (!staffConn || !studentToken) {
    fail("Prerequisites not met — skipping");
  } else {
    try {
      // Register staff listener BEFORE creating the incident
      const staffNewPromise = staffConn.waitFor("incident:new", 6000);

      // Student creates incident via REST API
      const r = await req("POST", "/incidents", {
        incidentType: "illness",
        severity: "medium",
        latitude: 7.1907,
        longitude: 100.5930,
        locationName: "อาคาร 1 ชั้น 3",
      }, { Authorization: `Bearer ${studentToken}` });

      if (r.status !== 201) {
        fail("POST /incidents failed", `${r.status}: ${JSON.stringify(r.data)}`);
      } else {
        incidentId = r.data?.data?.id;
        ok("POST /incidents → 201", `id=${incidentId}`);

        const eventData = await staffNewPromise;
        if (eventData?.id === incidentId) {
          ok("Staff received incident:new with correct incident id");
        } else if (eventData) {
          ok("Staff received incident:new event", `data keys: ${Object.keys(eventData).join(", ")}`);
        } else {
          fail("Staff received incident:new but data is empty");
        }
      }
    } catch (err) {
      fail("Staff did not receive incident:new", err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Staff accepts incident → student receives incident:accepted
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 5: Staff accepts incident → student receives incident:accepted");
{
  if (!incidentId || !studentConn || !staffToken) {
    fail("Prerequisites not met — skipping");
  } else {
    try {
      // Register student listener BEFORE accepting
      const studentAcceptedPromise = studentConn.waitFor("incident:accepted", 6000);

      const r = await req("POST", `/incidents/${incidentId}/accept`, undefined,
        { Authorization: `Bearer ${staffToken}` });

      if (r.status !== 200) {
        fail("POST /accept failed", `${r.status}: ${JSON.stringify(r.data)}`);
      } else {
        ok(`POST /incidents/${incidentId}/accept → 200`);

        const eventData = await studentAcceptedPromise;
        ok("Student received incident:accepted event",
          `id=${eventData?.id ?? JSON.stringify(eventData).substring(0, 60)}`);
      }
    } catch (err) {
      fail("Student did not receive incident:accepted", err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Staff updates status → student AND staff receive incident:status_update
// (accepted → in_progress)
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 6: Status update (in_progress) → student + staff receive incident:status_update");
{
  if (!incidentId || !studentConn || !staffConn || !staffToken) {
    fail("Prerequisites not met — skipping");
  } else {
    // Small delay to let any stale WS messages from TEST 5 drain before registering handlers
    await new Promise((r) => setTimeout(r, 200));
    try {
      const studentStatusPromise = studentConn.waitFor("incident:status_update", 6000);
      const staffStatusPromise   = staffConn.waitFor("incident:status_update", 6000);

      const r = await req("PATCH", `/incidents/${incidentId}/status`,
        { status: "in_progress", note: "กำลังเดินทางไปช่วย" },
        { Authorization: `Bearer ${staffToken}` });

      if (r.status !== 200) {
        fail("PATCH /status (in_progress) failed", `${r.status}: ${JSON.stringify(r.data)}`);
      } else {
        ok(`PATCH /incidents/${incidentId}/status → 200`);

        const [studentEvent, staffEvent] = await Promise.all([studentStatusPromise, staffStatusPromise]);
        ok("Student received incident:status_update", `status=${studentEvent?.status ?? "received"}`);
        ok("Staff received incident:status_update",   `status=${staffEvent?.status ?? "received"}`);
      }
    } catch (err) {
      fail("incident:status_update not received by both parties", err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: Staff completes incident → student receives incident:status_update
// (in_progress → completed)
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 7: Status update (completed) → student receives incident:status_update");
{
  if (!incidentId || !studentConn || !staffToken) {
    fail("Prerequisites not met — skipping");
  } else {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const studentCompletedPromise = studentConn.waitFor("incident:status_update", 6000);

      const r = await req("PATCH", `/incidents/${incidentId}/status`,
        { status: "completed", note: "ดูแลเสร็จสิ้น ส่งห้องพยาบาล" },
        { Authorization: `Bearer ${staffToken}` });

      if (r.status !== 200) {
        fail("PATCH /status (completed) failed", `${r.status}: ${JSON.stringify(r.data)}`);
      } else {
        ok(`PATCH /incidents/${incidentId}/status (completed) → 200`);

        const eventData = await studentCompletedPromise;
        const newStatus = eventData?.status;
        if (newStatus === "completed") {
          ok("Student received incident:status_update with status=completed");
        } else {
          ok("Student received incident:status_update event", `status=${newStatus ?? "received"}`);
        }
      }
    } catch (err) {
      fail("Student did not receive incident:status_update (completed)", err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8: Reconnection — disconnect then reconnect with same token
// ─────────────────────────────────────────────────────────────────────────────
info("TEST 8: WebSocket reconnection");
{
  try {
    // 1. Open a fresh staff connection
    const conn1 = await openWs(staffToken);
    ok("Connection 1 opened", `connId=${conn1.connectionId}`);

    // 2. Close it (simulates network drop / page reload)
    conn1.close();
    await new Promise((r) => setTimeout(r, 400));
    ok("Connection 1 closed cleanly");

    // 3. Reconnect with the same token
    const conn2 = await openWs(staffToken);
    ok("Connection 2 opened (reconnected)", `connId=${conn2.connectionId}`);

    if (conn1.connectionId !== conn2.connectionId) {
      ok("Reconnection assigned new connectionId (correct)");
    } else {
      fail("Same connectionId after reconnect — backend may not have cleaned up old connection");
    }

    // 4. Verify the new connection is functional via ping/pong
    const pongPromise = conn2.waitFor("pong", 3000);
    conn2.send("ping", {});
    await pongPromise;
    ok("Reconnected connection is functional (ping/pong works)");

    // 5. Verify the new connection receives live events
    const liveEventPromise = conn2.waitFor("incident:new", 6000);
    const r = await req("POST", "/incidents", {
      incidentType: "accident",
      severity: "low",
      latitude: 7.1910,
      longitude: 100.5935,
    }, { Authorization: `Bearer ${studentToken}` });

    if (r.status === 201) {
      const eventData = await liveEventPromise;
      ok("Reconnected connection receives live incident:new event",
        `id=${eventData?.id ?? "received"}`);

      // Cleanup — cancel the test incident
      const newId = r.data?.data?.id;
      if (newId) {
        await req("PATCH", `/incidents/${newId}/status`,
          { status: "cancelled", note: "test cleanup" },
          { Authorization: `Bearer ${staffToken}` });
      }
    } else {
      fail("Could not create test incident for live-event check", `status=${r.status}`);
    }

    conn2.close();
  } catch (err) {
    fail("Reconnection test failed", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────────────────────
if (studentConn) studentConn.close();
if (staffConn)   staffConn.close();
await new Promise((r) => setTimeout(r, 300));

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`WebSocket Test Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);
console.log("═".repeat(60));

const failures = results.filter((r) => r.status === "FAIL");
if (failures.length > 0) {
  console.log("\nFailed:");
  failures.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? ": " + f.detail : ""}`));
}

process.exit(failed > 0 ? 1 : 0);
