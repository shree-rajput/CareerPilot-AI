import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { requireAuth, requireRole } from "../src/middleware/auth.js";

describe("Mentor Auth & RBAC Middleware Tests", () => {
  test("requireAuth rejects missing or invalid Bearer header", async () => {
    const req = { headers: {} };
    let errorCaught = null;
    await requireAuth(req, {}, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught, "Expected authentication error");
    assert.equal(errorCaught.statusCode, 401);
  });

  test("requireRole allows permitted role and blocks unauthorized role", () => {
    const middleware = requireRole("mentor", "admin");

    // Permitted mentor
    let calledNext = false;
    middleware({ user: { role: "mentor" } }, {}, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true, "Mentor role should be allowed");

    // Blocked student
    let forbiddenError = null;
    middleware({ user: { role: "student" } }, {}, (err) => {
      forbiddenError = err;
    });
    assert.ok(forbiddenError, "Student role should be rejected");
    assert.equal(forbiddenError.statusCode, 403);
  });
});
