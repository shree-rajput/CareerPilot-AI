/**
 * DOCX text extraction using Mammoth.
 *
 * Responsibility:
 * DOCX Buffer -> Plain Text
 *
 * This file does NOT:
 * - call AI
 * - structure resume data
 * - save to MongoDB
 * - upload to Cloudinary
 */

import mammoth from "mammoth";
import { AppError } from "../../utils/errors.js";

/**
 * Extract plain text from a DOCX buffer.
 *
 * @param {Buffer} buffer - Raw DOCX file buffer
 * @returns {Promise<string>} - Extracted plain text
 */
export async function extractDocxText(buffer) {
  // --------------------------------------------------
  // 1. Validate input
  // --------------------------------------------------

  if (!buffer) {
    throw new AppError(
      "No DOCX file data was provided.",
      400,
      "DOCX_BUFFER_MISSING",
    );
  }

  if (!Buffer.isBuffer(buffer)) {
    throw new AppError("Invalid DOCX file data.", 400, "DOCX_INVALID_BUFFER");
  }

  if (buffer.length === 0) {
    throw new AppError("The uploaded DOCX file is empty.", 422, "DOCX_EMPTY");
  }

  // --------------------------------------------------
  // 2. Basic DOCX signature validation
  // --------------------------------------------------
  //
  // DOCX files are ZIP containers.
  // A normal DOCX file starts with the ZIP signature:
  //
  // PK\x03\x04
  //
  // This prevents us from blindly sending arbitrary
  // files to Mammoth.
  // --------------------------------------------------

  const isZip =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;

  if (!isZip) {
    throw new AppError(
      "The uploaded file does not appear to be a valid DOCX document.",
      422,
      "DOCX_INVALID_FORMAT",
    );
  }

  // --------------------------------------------------
  // 3. Extract raw text
  // --------------------------------------------------

  let result;

  try {
    result = await mammoth.extractRawText({
      buffer,
    });
  } catch (error) {
    console.error("DOCX extraction failed:", error);

    throw new AppError(
      "Failed to read the DOCX document. The file may be corrupted or invalid.",
      422,
      "DOCX_PARSE_FAILED",
    );
  }

  // --------------------------------------------------
  // 4. Validate extracted text
  // --------------------------------------------------

  const text = result?.value?.trim() || "";

  if (!text) {
    throw new AppError(
      "Could not extract readable text from this DOCX file.",
      422,
      "DOCX_NO_TEXT",
    );
  }

  // --------------------------------------------------
  // 5. Detect extremely small / probably unusable text
  // --------------------------------------------------

  if (text.length < 50) {
    throw new AppError(
      "The DOCX file does not contain enough readable text to analyze as a resume.",
      422,
      "DOCX_INSUFFICIENT_TEXT",
    );
  }

  // --------------------------------------------------
  // 6. Return text
  // --------------------------------------------------

  return text;
}
