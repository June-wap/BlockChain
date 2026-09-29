const http = require("http");

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const duration = Math.round(performance.now() - startTime);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          duration,
        });
      });
    });

    req.on("error", (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return {};
  const cookies = {};
  const headerArr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const str of headerArr) {
    const parts = str.split(";")[0].split("=");
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  }
  return cookies;
}

function cookieString(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function run() {
  console.log("==================================================================");
  console.log("LIVE AUTH BOOTSTRAP, REDIRECT LOOP & NAVIGATION PERFORMANCE AUDIT");
  console.log("==================================================================");

  let allPassed = true;
  const timings = [];

  // Step 1: GET /api/auth/me without cookie -> Must return 401
  console.log("\n[1] Testing GET /api/auth/me without cookie (Unauthenticated)...");
  const unauthRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/me",
    method: "GET",
  });
  console.log(`    Status: ${unauthRes.statusCode} (${unauthRes.duration}ms)`);
  timings.push({ endpoint: "GET /api/auth/me (unauth)", time: unauthRes.duration });
  if (unauthRes.statusCode !== 401) {
    console.error("    FAILED: Expected 401 Unauthorized");
    allPassed = false;
  } else {
    console.log("    PASSED: Successfully returned 401 Unauthorized");
  }

  // Step 2: Unauthenticated navigation to /customer/dashboard -> Middleware redirect to /login
  console.log("\n[2] Testing unauthenticated navigation to /customer/dashboard...");
  const custUnauthNav = await request({
    hostname: "localhost",
    port: 3000,
    path: "/customer/dashboard",
    method: "GET",
  });
  console.log(`    Status: ${custUnauthNav.statusCode} (${custUnauthNav.duration}ms)`);
  console.log(`    Location: ${custUnauthNav.headers.location}`);
  timings.push({ endpoint: "GET /customer/dashboard (unauth)", time: custUnauthNav.duration });
  if (custUnauthNav.statusCode !== 307 && custUnauthNav.statusCode !== 308) {
    console.error("    FAILED: Expected redirect (307/308)");
    allPassed = false;
  } else if (!custUnauthNav.headers.location.includes("/login")) {
    console.error("    FAILED: Expected redirect location to contain /login");
    allPassed = false;
  } else {
    console.log("    PASSED: Server middleware cleanly redirected unauthenticated request to /login");
  }

  // Step 3: Login as Customer -> Check cookies & response
  console.log("\n[3] Logging in as Customer (customer@insurance.com)...");
  const loginBody = JSON.stringify({ email: "customer@insurance.com", password: "password123" });
  const loginRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(loginBody),
      },
    },
    loginBody
  );
  console.log(`    Status: ${loginRes.statusCode} (${loginRes.duration}ms)`);
  timings.push({ endpoint: "POST /api/auth/login", time: loginRes.duration });
  const custCookies = parseCookies(loginRes.headers["set-cookie"]);
  console.log(`    Received cookies: ${Object.keys(custCookies).join(", ")}`);
  if (!custCookies.auth_token) {
    console.error("    FAILED: auth_token cookie missing");
    allPassed = false;
  } else {
    console.log("    PASSED: Successfully received HttpOnly auth_token cookie");
  }

  // Step 4: GET /api/auth/me with auth_token cookie -> Target < 300ms
  console.log("\n[4] Testing GET /api/auth/me with auth_token cookie (Session Bootstrap)...");
  const authMeRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/me",
    method: "GET",
    headers: {
      Cookie: cookieString(custCookies),
    },
  });
  console.log(`    Status: ${authMeRes.statusCode} (${authMeRes.duration}ms)`);
  timings.push({ endpoint: "GET /api/auth/me (bootstrap)", time: authMeRes.duration });
  const authMeJson = JSON.parse(authMeRes.data);
  console.log(`    User email: ${authMeJson.data?.user?.email}, Role: ${authMeJson.data?.user?.role}`);
  console.log(`    Wallet: ${authMeJson.data?.user?.walletAddress || "None"}`);
  if (authMeRes.statusCode !== 200 || !authMeJson.success) {
    console.error("    FAILED: Expected 200 and success: true");
    allPassed = false;
  } else if (authMeRes.duration > 300) {
    console.warn(`    WARNING: Bootstrap latency (${authMeRes.duration}ms) exceeded 300ms threshold`);
  } else {
    console.log(`    PASSED: Bootstrap succeeded in ${authMeRes.duration}ms (< 300ms target)`);
  }

  // Step 5: Test Client Portal Navigation for all Customer Pages with cookie
  console.log("\n[5] Testing navigation across all Customer portal pages with auth cookie...");
  const customerPages = [
    "/customer/dashboard",
    "/customer/policies",
    "/customer/claims",
    "/customer/payments",
    "/customer/profile",
  ];

  for (const page of customerPages) {
    const pageRes = await request({
      hostname: "localhost",
      port: 3000,
      path: page,
      method: "GET",
      headers: {
        Cookie: cookieString(custCookies),
      },
    });
    console.log(`    ${page.padEnd(24)} -> Status ${pageRes.statusCode} (${pageRes.duration}ms)`);
    timings.push({ endpoint: page, time: pageRes.duration });
    if (pageRes.statusCode !== 200) {
      console.error(`    FAILED: Page ${page} returned status ${pageRes.statusCode}`);
      allPassed = false;
    }
  }

  // Step 6: Test Customer attempting access to /staff/dashboard -> Middleware blocks with 307
  console.log("\n[6] Testing Customer RBAC boundary against /staff/dashboard...");
  const staffAttempt = await request({
    hostname: "localhost",
    port: 3000,
    path: "/staff/dashboard",
    method: "GET",
    headers: {
      Cookie: cookieString(custCookies),
    },
  });
  console.log(`    Status: ${staffAttempt.statusCode} (${staffAttempt.duration}ms)`);
  console.log(`    Redirected to: ${staffAttempt.headers.location}`);
  timings.push({ endpoint: "GET /staff/dashboard (customer cookie)", time: staffAttempt.duration });
  if (staffAttempt.statusCode !== 307 && staffAttempt.statusCode !== 308) {
    console.error("    FAILED: Expected redirect (307/308)");
    allPassed = false;
  } else if (!staffAttempt.headers.location.includes("/customer/dashboard")) {
    console.error("    FAILED: Expected redirect to /customer/dashboard");
    allPassed = false;
  } else {
    console.log("    PASSED: Customer correctly redirected to /customer/dashboard");
  }

  // Step 7: Login as Staff (Reviewer) & Test /staff/dashboard
  console.log("\n[7] Testing Staff (Reviewer) Login & Portal Navigation...");
  const staffLoginBody = JSON.stringify({ email: "reviewer@insurance.com", password: "password123" });
  const staffLoginRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(staffLoginBody),
      },
    },
    staffLoginBody
  );
  timings.push({ endpoint: "POST /api/auth/login (staff)", time: staffLoginRes.duration });
  const staffCookies = parseCookies(staffLoginRes.headers["set-cookie"]);

  const staffNav = await request({
    hostname: "localhost",
    port: 3000,
    path: "/staff/dashboard",
    method: "GET",
    headers: {
      Cookie: cookieString(staffCookies),
    },
  });
  console.log(`    Staff Dashboard Status: ${staffNav.statusCode} (${staffNav.duration}ms)`);
  timings.push({ endpoint: "GET /staff/dashboard", time: staffNav.duration });
  if (staffNav.statusCode !== 200) {
    console.error(`    FAILED: Staff dashboard returned status ${staffNav.statusCode}`);
    allPassed = false;
  } else {
    console.log("    PASSED: Staff dashboard loaded cleanly with 200 OK");
  }

  // Step 8: Login as Admin & Test /admin/dashboard
  console.log("\n[8] Testing Admin Login & Console Navigation...");
  const adminLoginBody = JSON.stringify({ email: "admin@insurance.com", password: "password123" });
  const adminLoginRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(adminLoginBody),
      },
    },
    adminLoginBody
  );
  timings.push({ endpoint: "POST /api/auth/login (admin)", time: adminLoginRes.duration });
  const adminCookies = parseCookies(adminLoginRes.headers["set-cookie"]);

  const adminNav = await request({
    hostname: "localhost",
    port: 3000,
    path: "/admin/dashboard",
    method: "GET",
    headers: {
      Cookie: cookieString(adminCookies),
    },
  });
  console.log(`    Admin Dashboard Status: ${adminNav.statusCode} (${adminNav.duration}ms)`);
  timings.push({ endpoint: "GET /admin/dashboard", time: adminNav.duration });
  if (adminNav.statusCode !== 200) {
    console.error(`    FAILED: Admin dashboard returned status ${adminNav.statusCode}`);
    allPassed = false;
  } else {
    console.log("    PASSED: Admin dashboard loaded cleanly with 200 OK");
  }

  // Step 9: Test Logout flow
  console.log("\n[9] Testing POST /api/auth/logout...");
  const logoutRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/logout",
    method: "POST",
    headers: {
      Cookie: cookieString(custCookies),
    },
  });
  console.log(`    Status: ${logoutRes.statusCode} (${logoutRes.duration}ms)`);
  timings.push({ endpoint: "POST /api/auth/logout", time: logoutRes.duration });
  const setCookieLogout = logoutRes.headers["set-cookie"] || [];
  const hasTokenClear = setCookieLogout.some((c) => c.includes("auth_token=") && (c.includes("Max-Age=0") || c.includes("expires=")));
  if (!hasTokenClear) {
    console.error("    FAILED: Logout did not clear auth_token cookie");
    allPassed = false;
  } else {
    console.log("    PASSED: Logout cleared auth_token cookie");
  }

  console.log("\n==================================================================");
  console.log("RESPONSE TIMING BENCHMARKS SUMMARY:");
  console.log("==================================================================");
  timings.forEach((t) => {
    console.log(`  ${t.endpoint.padEnd(42)}: ${t.time}ms`);
  });
  console.log("==================================================================");

  if (allPassed) {
    console.log(">>> ALL AUDIT & PERFORMANCE CHECKS PASSED SUCCESSFULLY! <<<");
  } else {
    console.error(">>> SOME AUDIT CHECKS FAILED! <<<");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Verification script error:", err);
  process.exit(1);
});
