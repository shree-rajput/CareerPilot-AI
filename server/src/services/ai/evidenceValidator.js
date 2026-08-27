/**
 * Evidence Validator
 * Prevents hallucinations by ensuring any evidence the LLM claims to have found
 * is actually present in the source material provided.
 */

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Validates that an evidence item claimed by the AI exists in the source context.
 * @param {object} evidenceData - Structured evidence (e.g., { requirement, resumeEvidence, classification })
 * @param {string} sourceContext - The actual text given to the LLM (e.g., the resume text)
 * @returns {object} Validated evidence (classification downgraded to "missing" if hallucinated)
 */
export function validateEvidence(evidenceData, sourceContext) {
  if (!evidenceData) return evidenceData;
  if (!evidenceData.resumeEvidence) return evidenceData;
  
  if (evidenceData.classification === "missing" || evidenceData.classification === "unknown") {
    return evidenceData;
  }

  const normalizedSource = normalizeText(sourceContext);
  const normalizedEvidence = normalizeText(evidenceData.resumeEvidence);

  // If the claimed evidence is not in the source context, it's a hallucination.
  // We do a simple substring check on the normalized text.
  if (normalizedEvidence && !normalizedSource.includes(normalizedEvidence)) {
    console.warn(`[EvidenceValidator] Hallucination detected! Claimed evidence not in source. Downgrading to missing.`);
    return {
      ...evidenceData,
      classification: "missing", // Downgrade
      resumeEvidence: "", // Remove the fake evidence
      _hallucinationDetected: true
    };
  }

  return evidenceData;
}
