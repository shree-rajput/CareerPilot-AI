import assert from "node:assert/strict";
import { repairHistory } from "../src/scripts/repairApplicationStatusHistory.js";

const result = repairHistory({
  status: "interview",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-03T00:00:00Z"),
  statusHistory: [
    { fromStatus: "", status: "saved", timestamp: new Date("2026-01-01T00:00:00Z") },
    { fromStatus: "saved", newStatus: "applied", timestamp: new Date("2026-01-02T00:00:00Z") },
    { fromStatus: "applied" },
  ],
});

assert.equal(result.repairedEntries, 3);
assert.equal(result.manualReviewEntries, 0);
assert.deepEqual(result.history.map((entry) => entry.toStatus), ["saved", "applied", "interview"]);
assert.ok(result.history.every((entry) => entry.fromStatus !== undefined && entry.toStatus && entry.changedAt));
assert.equal(result.finalStatus, "interview");

const unresolved = repairHistory({
  status: "saved",
  statusHistory: [{ fromStatus: "" }, { fromStatus: "" }],
});
assert.equal(unresolved.manualReviewEntries, 1);
assert.equal(unresolved.history.length, 1);
assert.equal(unresolved.manualReview.length, 1);

console.log("Application status migration tests passed.");
