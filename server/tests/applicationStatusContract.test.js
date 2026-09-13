import assert from "node:assert/strict";
import { createInitialStatusHistory, transitionApplicationStatus } from "../src/services/career/statusTransitionEngine.js";

function createApplication(status = "saved") {
  return {
    status,
    statusHistory: [createInitialStatusHistory(status, { changedAt: new Date("2026-01-01T00:00:00Z") })],
    dateApplied: null,
    interviewDate: null,
    lastActivityAt: null,
  };
}

const app = createApplication();
for (const targetStatus of ["applied", "oa", "interview", "offer"]) {
  const result = transitionApplicationStatus(app, { targetStatus, source: "user_manual_update" });
  assert.equal(result.success, true);
  assert.equal(result.changed, true);
}

assert.equal(app.status, "offer");
assert.ok(app.statusHistory.every((entry) => entry.fromStatus !== undefined && entry.toStatus && entry.changedAt));

const beforeDuplicate = app.statusHistory.length;
const duplicate = transitionApplicationStatus(app, { targetStatus: "offer", source: "user_manual_update" });
assert.equal(duplicate.success, true);
assert.equal(duplicate.changed, false);
assert.equal(app.statusHistory.length, beforeDuplicate);

const rejected = transitionApplicationStatus(app, { targetStatus: "rejected", source: "user_manual_update" });
assert.equal(rejected.success, true);
assert.equal(app.statusHistory.at(-1).toStatus, "rejected");

console.log("Application status contract tests passed.");
