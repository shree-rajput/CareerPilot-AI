/**
 * Resume version diff service using the `diff` npm package.
 * Computes a character-level diff between two resume texts.
 */

import { diffWords } from "diff";

/**
 * Compare two resume raw texts and return a structured diff.
 *
 * @param {string} textA - Older version text
 * @param {string} textB - Newer version text
 * @returns {{ parts: Array<{ value: string, added?: boolean, removed?: boolean }>, summary: { added: number, removed: number, unchanged: number } }}
 */
export function compareResumeVersions(textA, textB) {
  const parts = diffWords(textA || "", textB || "");

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const part of parts) {
    const wordCount = part.value.trim().split(/\s+/).filter(Boolean).length;
    if (part.added) added += wordCount;
    else if (part.removed) removed += wordCount;
    else unchanged += wordCount;
  }

  return {
    parts,
    summary: { added, removed, unchanged }
  };
}
