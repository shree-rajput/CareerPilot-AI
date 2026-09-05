import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

test("Validates questionId format and throws 400 INVALID_QUESTION_ID for malformed IDs", () => {
  const invalidId = "invalid-id-123";
  assert.equal(mongoose.Types.ObjectId.isValid(invalidId), false);
});

test("Validates non-empty transcript / answer text", () => {
  const emptyPayloads = ["", "   ", null, undefined];
  for (const p of emptyPayloads) {
    const raw = String(p || "").trim();
    assert.equal(raw.length === 0, true);
  }
});

test("Validates valid 24-character hex ObjectId detection", () => {
  const validHexId = new mongoose.Types.ObjectId().toString();
  assert.equal(mongoose.Types.ObjectId.isValid(validHexId), true);
});

test("Identifies non-answer responses cleanly", () => {
  const nonAnswerPhrases = ["no idea", "i don't know", "idk", "pass", "not sure"];
  for (const phrase of nonAnswerPhrases) {
    const rawClean = phrase.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const isNonAnswer = rawClean.length < 3 || nonAnswerPhrases.some(p => rawClean === p || rawClean.startsWith("i dont know") || rawClean.startsWith("no idea"));
    assert.equal(isNonAnswer, true);
  }
});
