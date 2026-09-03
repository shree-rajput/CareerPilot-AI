import { PDFParse } from "pdf-parse";

/**
 * OCR Fallback Service Boundary.
 * Stub/adapter for image-based scanned PDF OCR processing.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<string>}
 */
export async function extractWithOcr(pdfBuffer) {
  // Service boundary: If OCR engine (Tesseract/Cloud Vision) is configured in environment,
  // execute OCR here. Otherwise return empty string.
  console.log("[pdfExtractionService] OCR fallback invoked for low-confidence PDF.");
  return "";
}

/**
 * Extract text from PDF buffer and calculate quality confidence score.
 * @param {Buffer} pdfBuffer PDF File Buffer
 * @returns {Promise<Object>} Extraction result with quality score & text
 */
export async function extractPdfTextWithQualityCheck(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error("Invalid PDF buffer provided.");
  }

  let rawText = "";
  try {
    const data = await PDFParse(pdfBuffer);
    rawText = (data.text || "").trim();
  } catch (err) {
    console.error("[pdfExtractionService] pdf-parse failed:", err.message);
  }

  // If initial native extraction yields very little text, attempt OCR fallback boundary
  if (rawText.length < 50) {
    const ocrText = await extractWithOcr(pdfBuffer);
    if (ocrText && ocrText.length > rawText.length) {
      rawText = ocrText.trim();
    }
  }

  // Calculate Quality Confidence Score
  const totalLength = rawText.length;
  if (totalLength < 30) {
    return {
      text: rawText,
      qualityScore: 10,
      isHighConfidence: false,
      message: "We couldn't confidently read this PDF. Scanned or empty PDF detected.",
    };
  }

  // 1. Alphanumeric & punctuation ratio
  const alphanumericCount = (rawText.match(/[a-zA-Z0-9\s.,;:'"()\-]/g) || []).length;
  const alphaRatio = alphanumericCount / totalLength;

  // 2. Structural checks (Presence of standard job sections or words)
  const lowerText = rawText.toLowerCase();
  const keywords = ["experience", "qualification", "responsibilities", "skills", "requirement", "role", "education", "about"];
  const matchedKeywords = keywords.filter((kw) => lowerText.includes(kw)).length;

  let qualityScore = Math.round(alphaRatio * 70 + (matchedKeywords / keywords.length) * 30);
  qualityScore = Math.min(100, Math.max(0, qualityScore));

  const isHighConfidence = qualityScore >= 60;

  return {
    text: rawText,
    qualityScore,
    isHighConfidence,
    message: isHighConfidence
      ? "Job description extracted successfully."
      : "We couldn't confidently read this PDF. Please review and edit the extracted text below.",
  };
}
