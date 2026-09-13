import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { connectDatabase } from "../config/db.js";
import { Application, STATUS_VALUES } from "../models/Application.js";

const APPLY = process.argv.includes("--apply");
const STATUS_SET = new Set(STATUS_VALUES);
const LEGACY_STATUS_KEYS = ["toStatus", "status", "newStatus", "currentStatus", "to", "nextStatus"];
const CHANGED_BY_VALUES = new Set(["manual", "ai", "email", "calendar", "auto_stale", "system", "user_confirmation", "extension_capture", "user_manual_update", "trusted_external_signal"]);
const CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);

function validStatus(value) {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function repairHistory(application) {
  const history = Array.isArray(application.statusHistory) ? application.statusHistory : [];
  const repaired = [];
  const manualReview = [];
  let repairedEntries = 0;
  let manualReviewEntries = 0;

  for (let index = 0; index < history.length; index += 1) {
    const entry = { ...history[index] };
    let target = LEGACY_STATUS_KEYS.map((key) => entry[key]).find(validStatus);

    // The next entry's `fromStatus` is reliable evidence of this entry's target.
    if (!target && validStatus(history[index + 1]?.fromStatus)) {
      target = history[index + 1].fromStatus;
    }
    // The current application status can only safely repair the final entry.
    if (!target && index === history.length - 1 && validStatus(application.status)) {
      target = application.status;
    }

    if (!target) {
      manualReviewEntries += 1;
      manualReview.push({
        ...entry,
        migrationReason: "Unable to determine toStatus from legacy fields, adjacent history, or current status.",
        migratedAt: new Date(),
      });
      continue;
    }

    const previousTarget = repaired[index - 1]?.toStatus;
    const changedAt = entry.changedAt || entry.timestamp || application.updatedAt || application.createdAt || new Date();
    const normalized = {
      ...entry,
      fromStatus: validStatus(entry.fromStatus) ? entry.fromStatus : (previousTarget || ""),
      toStatus: target,
      changedBy: CHANGED_BY_VALUES.has(entry.changedBy)
        ? entry.changedBy
        : String(entry.source || "").startsWith("extension") ? "extension_capture" : "system",
      confidence: CONFIDENCE_VALUES.has(entry.confidence) ? entry.confidence : "high",
      changedAt,
      timestamp: entry.timestamp || changedAt,
    };

    if (
      entry.toStatus !== normalized.toStatus ||
      entry.fromStatus !== normalized.fromStatus ||
      entry.changedBy !== normalized.changedBy ||
      entry.confidence !== normalized.confidence ||
      !entry.changedAt ||
      !entry.timestamp
    ) {
      repairedEntries += 1;
    }
    repaired.push(normalized);
  }

  const finalStatus = repaired.at(-1)?.toStatus || null;
  const statusNeedsRepair = Boolean(finalStatus && application.status !== finalStatus);
  return { history: repaired, manualReview, repairedEntries, manualReviewEntries, finalStatus, statusNeedsRepair };
}

async function run() {
  await connectDatabase();
  const stats = {
    mode: APPLY ? "apply" : "dry-run",
    applicationsScanned: 0,
    applicationsRepaired: 0,
    historyEntriesRepaired: 0,
    entriesRequiringManualReview: 0,
  };

  const cursor = Application.collection.find({ statusHistory: { $exists: true, $ne: [] } });
  for await (const application of cursor) {
    stats.applicationsScanned += 1;
    const result = repairHistory(application);
    stats.historyEntriesRepaired += result.repairedEntries;
    stats.entriesRequiringManualReview += result.manualReviewEntries;

    if (result.repairedEntries > 0 || result.manualReviewEntries > 0 || result.statusNeedsRepair) {
      stats.applicationsRepaired += 1;
      if (APPLY) {
        await Application.collection.updateOne(
          { _id: application._id },
          {
            $set: {
              statusHistory: result.history,
              ...(result.statusNeedsRepair ? { status: result.finalStatus } : {}),
            },
            ...(result.manualReview.length > 0
              ? { $push: { statusHistoryManualReview: { $each: result.manualReview } } }
              : {}),
          },
        );
      }
    }

    if (result.manualReviewEntries > 0) {
      console.warn("[StatusHistoryMigration] Manual review required", {
        applicationId: application._id.toString(),
        userId: application.userId?.toString(),
        entries: result.manualReviewEntries,
      });
    }
  }

  console.log("[StatusHistoryMigration] Complete", stats);
  if (!APPLY) {
    console.log("[StatusHistoryMigration] Dry run only. Re-run with --apply after reviewing the output.");
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFile === currentFile) {
  run()
    .catch((error) => {
      console.error("[StatusHistoryMigration] Failed", { error: error.message, stack: error.stack });
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
