/**
 * PDF text extraction using Mozilla PDF.js (pdfjs-dist).
 *
 * Why pdfjs-dist over pdf-parse:
 * - pdf-parse wraps pdfjs internally but with an older version
 * - pdfjs-dist is the actively maintained Mozilla library
 * - Better handling of complex layouts, font encoding, and multi-column PDFs
 * - No external API calls — fully local
 *
 * Limitations (show these to the user clearly):
 * - Scanned/image PDFs cannot be parsed (no OCR)
 * - Heavily formatted PDFs (tables, graphics) may have imperfect text order
 */

import { AppError } from "../../utils/errors.js";

/**
 * Extract plain text from a PDF buffer.
 * @param {Buffer} buffer - Raw PDF file buffer
 * @returns {Promise<string>} - Extracted plain text
 */
export async function extractPdfText(buffer) {
  let pdfjsLib;

  try {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    throw new AppError(
      "PDF processing library failed to load. Please try again.",
      500,
      "PDF_LIB_UNAVAILABLE"
    );
  }

  // Disable the worker in Node.js environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  let doc;

  try {
    const uint8Array = new Uint8Array(buffer);
    doc = await pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    }).promise;
  } catch (err) {
    // If it fails to parse, it might be a scanned PDF or corrupted file
    const message =
      err?.name === "InvalidPDFException"
        ? "The file does not appear to be a valid PDF."
        : err?.name === "PasswordException"
          ? "Password-protected PDFs are not supported."
          : "Failed to parse the PDF. It may be scanned or corrupted.";

    throw new AppError(message, 422, "PDF_PARSE_FAILED");
  }

  const pageTexts = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    // Join text items, preserving line breaks via y-position changes
    let lastY = null;
    const lineFragments = [];

    for (const item of content.items) {
      if ("str" in item) {
        // New line if y position changed significantly
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
          lineFragments.push("\n");
        }
        lineFragments.push(item.str);
        lastY = item.transform[5];
      }
    }

    pageTexts.push(lineFragments.join(""));
  }

  const fullText = pageTexts
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();

  if (!fullText || fullText.length < 50) {
    throw new AppError(
      "Could not extract readable text from this PDF. It may be a scanned or image-only PDF.",
      422,
      "PDF_NO_TEXT"
    );
  }

  return fullText;
}

/**
 * Extract text from a plain .txt file buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
export function extractTxtText(buffer) {
  const text = buffer.toString("utf-8").trim();

  if (!text || text.length < 50) {
    throw new AppError("The uploaded text file appears to be empty.", 422, "TXT_EMPTY");
  }

  return text;
}
