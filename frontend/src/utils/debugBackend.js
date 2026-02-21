/**
 * API Debug Utility
 * Test backend connectivity and CORS configuration
 */

export const debugBackend = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 BACKEND DEBUG TEST");
  console.log("=".repeat(60));

  const backendUrl = "http://localhost:5000";
  const healthUrl = `${backendUrl}/health`;

  // Test 1: Simple health check
  console.log("\n1️⃣  Testing health endpoint...");
  try {
    const response = await fetch(healthUrl);
    console.log(`   ✓ Status: ${response.status}`);
    const data = await response.json();
    console.log(`   ✓ Response:`, data);
  } catch (err) {
    console.error(`   ✗ Failed:`, err.message);
    return false;
  }

  // Test 2: CORS preflight
  console.log("\n2️⃣  Testing CORS preflight...");
  try {
    const response = await fetch(`${backendUrl}/api/fabrics`, {
      method: "OPTIONS",
      headers: {
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization,Content-Type",
      },
    });
    console.log(`   ✓ Preflight Status: ${response.status}`);
    console.log("   ✓ CORS Headers:");
    const corsHeaders = [
      "access-control-allow-origin",
      "access-control-allow-methods",
      "access-control-allow-headers",
    ];
    corsHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        console.log(`     - ${header}: ${value}`);
      }
    });
  } catch (err) {
    console.error(`   ✗ Failed:`, err.message);
  }

  // Test 3: Simple GET without auth
  console.log("\n3️⃣  Testing GET /api/fabrics (expect 401 without token)...");
  try {
    const response = await fetch(`${backendUrl}/api/fabrics`);
    console.log(`   ✓ Status: ${response.status}`);
    if (response.status === 401) {
      console.log(`   ✓ Correctly requires authentication`);
    }
  } catch (err) {
    console.error(`   ✗ Failed:`, err.message);
  }

  // Test 4: GET with token
  console.log("\n4️⃣  Testing GET /api/fabrics with token...");
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("   ⚠️  No token in localStorage - login first");
  } else {
    try {
      const response = await fetch(`${backendUrl}/api/fabrics`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      console.log(`   ✓ Status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✓ Data:`, data);
      } else {
        const data = await response.json().catch(() => ({}));
        console.log(`   ✗ Error:`, data);
      }
    } catch (err) {
      console.error(`   ✗ Failed:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Debug test complete");
  console.log("=".repeat(60) + "\n");
};

export const createDebugButton = () => {
  const btn = document.createElement("button");
  btn.id = "debug-backend-btn";
  btn.textContent = "🔍 Debug Backend";
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 9999;
    font-size: 12px;
    font-weight: bold;
  `;
  btn.onclick = debugBackend;
  document.body.appendChild(btn);
};
