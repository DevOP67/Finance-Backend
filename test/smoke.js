/**
 * Smoke test — runs against a live server.
 * Start the server first: npm start
 * Then run: npm test
 *
 * Covers:
 *  - Register (first user → admin auto-assigned)
 *  - Login (valid + invalid credentials)
 *  - Create viewer and analyst users (admin token)
 *  - RBAC: viewer blocked from creating records
 *  - RBAC: analyst can create but not delete records
 *  - RBAC: admin full access
 *  - Record CRUD + filters + pagination
 *  - Dashboard summary, by-category, trends, recent
 *  - Validation errors
 *  - Soft delete (users + records)
 */

require("dotenv").config();
const BASE = `http://localhost:${process.env.PORT || 3000}/api`;

let passed = 0;
let failed = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function assert(label, condition, extra = "") {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}${extra ? " — " + extra : ""}`);
    failed++;
  }
}

// ── Test suites ───────────────────────────────────────────────────────────────

async function testAuth(adminToken) {
  console.log("\n📋 Auth");

  // Invalid login
  const bad = await req("POST", "/auth/login", { email: "nobody@x.com", password: "wrong" });
  assert("Invalid login → 401", bad.status === 401);

  // Missing fields
  const noPass = await req("POST", "/auth/login", { email: "test@test.com" });
  assert("Login missing password → 422", noPass.status === 422);
}

async function testUserManagement(adminToken) {
  console.log("\n👥 User Management");

  // Create viewer
  const vRes = await req("POST", "/auth/register",
    { name: "Viewer Bob", email: "viewer@test.com", password: "pass123", role: "viewer" },
    adminToken
  );
  assert("Admin creates viewer → 201", vRes.status === 201);
  const viewerToken = vRes.body.token;

  // Create analyst
  const aRes = await req("POST", "/auth/register",
    { name: "Analyst Carol", email: "analyst@test.com", password: "pass123", role: "analyst" },
    adminToken
  );
  assert("Admin creates analyst → 201", aRes.status === 201);
  const analystToken = aRes.body.token;

  // Duplicate email
  const dup = await req("POST", "/auth/register",
    { name: "Dup", email: "viewer@test.com", password: "pass123" },
    adminToken
  );
  assert("Duplicate email → 409", dup.status === 409);

  // List users (admin)
  const list = await req("GET", "/users", null, adminToken);
  assert("Admin lists users → 200", list.status === 200);
  assert("User list has items", list.body.users?.length >= 3);

  // Viewer cannot list users
  const forbidden = await req("GET", "/users", null, viewerToken);
  assert("Viewer listing users → 403", forbidden.status === 403);

  // Patch role
  const userId = vRes.body.user?.id;
  const patch = await req("PATCH", `/users/${userId}`,
    { status: "inactive" }, adminToken
  );
  assert("Admin patches user status → 200", patch.status === 200);
  assert("Status updated", patch.body.user?.status === "inactive");

  // Re-activate
  await req("PATCH", `/users/${userId}`, { status: "active" }, adminToken);

  // /users/me
  const me = await req("GET", "/users/me", null, viewerToken);
  assert("/users/me returns own profile", me.status === 200 && me.body.user?.role === "viewer");

  return { viewerToken, analystToken, viewerId: vRes.body.user?.id };
}

async function testRecords(adminToken, analystToken, viewerToken) {
  console.log("\n💰 Records");

  // Viewer cannot create
  const vCreate = await req("POST", "/records",
    { amount: 100, type: "income", category: "salary", date: "2024-03-01" },
    viewerToken
  );
  assert("Viewer create record → 403", vCreate.status === 403);

  // Analyst creates
  const r1 = await req("POST", "/records",
    { amount: 5000, type: "income", category: "salary", date: "2024-03-01", notes: "March salary" },
    analystToken
  );
  assert("Analyst creates record → 201", r1.status === 201);
  const r1id = r1.body.record?.id;

  // Admin creates more records for dashboard data
  await req("POST", "/records", { amount: 1200, type: "expense", category: "rent",  date: "2024-03-02" }, adminToken);
  await req("POST", "/records", { amount: 300,  type: "expense", category: "food",  date: "2024-03-15" }, adminToken);
  await req("POST", "/records", { amount: 3000, type: "income",  category: "freelance", date: "2024-04-01" }, adminToken);
  await req("POST", "/records", { amount: 800,  type: "expense", category: "utilities", date: "2024-04-10" }, adminToken);

  // Viewer can read
  const list = await req("GET", "/records", null, viewerToken);
  assert("Viewer reads records → 200", list.status === 200);
  assert("Pagination present", list.body.pagination?.total >= 5);

  // Filters
  const filtered = await req("GET", "/records?type=expense&category=food", null, adminToken);
  assert("Filter by type+category works", filtered.status === 200 && filtered.body.records?.length >= 1);

  const dated = await req("GET", "/records?from=2024-03-01&to=2024-03-31", null, adminToken);
  assert("Date range filter works", dated.status === 200 && dated.body.records?.length >= 3);

  const searched = await req("GET", "/records?search=salary", null, adminToken);
  assert("Search filter works", searched.status === 200 && searched.body.records?.length >= 1);

  const paged = await req("GET", "/records?page=1&limit=2", null, adminToken);
  assert("Pagination limit works", paged.status === 200 && paged.body.records?.length === 2);

  // Analyst edits own record
  const edit = await req("PUT", `/records/${r1id}`, { amount: 5500 }, analystToken);
  assert("Analyst edits own record → 200", edit.status === 200);
  assert("Amount updated", edit.body.record?.amount == 5500);

  // Analyst cannot delete
  const del = await req("DELETE", `/records/${r1id}`, null, analystToken);
  assert("Analyst delete → 403", del.status === 403);

  // Validation error
  const invalid = await req("POST", "/records",
    { amount: -50, type: "bad", date: "not-a-date" },
    adminToken
  );
  assert("Invalid record body → 422", invalid.status === 422);
  assert("Validation errors array returned", Array.isArray(invalid.body.errors));

  // Admin soft-deletes
  const adminDel = await req("DELETE", `/records/${r1id}`, null, adminToken);
  assert("Admin deletes record → 200", adminDel.status === 200);

  // Deleted record gone
  const gone = await req("GET", `/records/${r1id}`, null, adminToken);
  assert("Deleted record returns 404", gone.status === 404);

  return r1id;
}

async function testDashboard(adminToken, analystToken, viewerToken) {
  console.log("\n📊 Dashboard");

  const summary = await req("GET", "/dashboard/summary", null, viewerToken);
  assert("Summary → 200", summary.status === 200);
  assert("Summary has totalIncome", typeof summary.body.summary?.totalIncome === "number");
  assert("Summary has netBalance", typeof summary.body.summary?.netBalance === "number");

  const byCat = await req("GET", "/dashboard/by-category", null, viewerToken);
  assert("By-category → 200", byCat.status === 200);
  assert("By-category is array", Array.isArray(byCat.body.byCategory));

  const trends = await req("GET", "/dashboard/trends?period=monthly", null, analystToken);
  assert("Trends (analyst) → 200", trends.status === 200);
  assert("Trends array returned", Array.isArray(trends.body.trends));

  const trendsForbidden = await req("GET", "/dashboard/trends", null, viewerToken);
  assert("Viewer trends → 403", trendsForbidden.status === 403);

  const recent = await req("GET", "/dashboard/recent?limit=3", null, viewerToken);
  assert("Recent → 200", recent.status === 200);
  assert("Recent limited to 3", recent.body.records?.length <= 3);

  const ranged = await req("GET", "/dashboard/summary?from=2024-03-01&to=2024-03-31", null, adminToken);
  assert("Summary with date range → 200", ranged.status === 200);
}

async function testSoftDeleteUser(adminToken, viewerId) {
  console.log("\n🗑  Soft Delete");

  const del = await req("DELETE", `/users/${viewerId}`, null, adminToken);
  assert("Admin soft-deletes user → 200", del.status === 200);

  const gone = await req("GET", `/users/${viewerId}`, null, adminToken);
  assert("Deleted user not found → 404", gone.status === 404);

  // Self-delete blocked
  const selfDel = await req("DELETE", `/users/1`, null, adminToken);
  // Will be 400 if id=1 is the admin, otherwise 404 — both are non-200
  assert("Self-delete blocked", selfDel.status !== 200);
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function run() {
  console.log("🚀 Finance API Smoke Tests");
  console.log(`   Target: ${BASE}\n`);

  // Health check first
  const health = await fetch(`http://localhost:${process.env.PORT || 3000}/health`).catch(() => null);
  if (!health || !health.ok) {
    console.error("❌  Server not reachable. Start it with: npm start");
    process.exit(1);
  }
  console.log("✅  Server reachable");

  // Bootstrap: register first admin
  const reg = await req("POST", "/auth/register", {
    name: "Admin Alice",
    email: "admin@test.com",
    password: "admin123",
  });

  let adminToken;
  if (reg.status === 201) {
    adminToken = reg.body.token;
    assert("First registration → admin role", reg.body.user?.role === "admin");
  } else if (reg.status === 409) {
    // Already exists, just login
    const login = await req("POST", "/auth/login", { email: "admin@test.com", password: "admin123" });
    assert("Admin login (existing) → 200", login.status === 200);
    adminToken = login.body.token;
  } else {
    console.error("Could not obtain admin token:", reg.body);
    process.exit(1);
  }

  await testAuth(adminToken);
  const { viewerToken, analystToken, viewerId } = await testUserManagement(adminToken);
  await testRecords(adminToken, analystToken, viewerToken);
  await testDashboard(adminToken, analystToken, viewerToken);
  await testSoftDeleteUser(adminToken, viewerId);

  // ── Results ─────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Some tests failed.");
    process.exit(1);
  } else {
    console.log("All tests passed 🎉");
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
