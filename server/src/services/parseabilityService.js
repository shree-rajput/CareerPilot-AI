import { generatePdfBuffer } from "./pdfGeneratorService.js";
import getPdfText from "pdf-parse/lib/pdf-parse.js";

/**
 * Perform real PDF export -> text-extraction validation checklist.
 * @param {Object} structuredData Structured JSON resume content
 * @param {String} templateId Template style ID
 * @returns {Promise<Object>} Pass/Fail Parseability Checklist Report
 */
export async function validateResumeParseability(structuredData = {}, templateId = "classic") {
  const report = {
    textExtractable: false,
    readingOrderMatches: false,
    contactInfoDetected: false,
    hasProblematicStructure: false,
    missingText: [],
    verifiedAt: new Date(),
  };

  try {
    // 1. Render PDF to Buffer
    const pdfBuffer = await generatePdfBuffer(structuredData, templateId);

    // 2. Parse text back out from generated PDF Buffer
    const data = await getPdfText(pdfBuffer);
    const extractedText = (data.text || "").trim();

    // Fact 1: Is text extractable?
    report.textExtractable = extractedText.length >= 50;

    const lowerExtracted = extractedText.toLowerCase();

    // Fact 2: Contact Info Detected?
    const email = structuredData?.personal?.email || "";
    const phone = structuredData?.personal?.phone || "";
    const fullName = structuredData?.personal?.fullName || "";

    const hasEmail = email && lowerExtracted.includes(email.toLowerCase());
    const hasPhone = phone && lowerExtracted.includes(phone.replace(/[^0-9]/g, ""));
    const hasName = fullName && lowerExtracted.includes(fullName.toLowerCase());

    report.contactInfoDetected = Boolean(hasEmail || hasPhone || hasName);

    // Fact 3: Missing Text check
    const missing = [];

    // Check Experience Companies and Roles
    (structuredData.experience || []).forEach((exp) => {
      if (exp.company && !lowerExtracted.includes(exp.company.toLowerCase())) {
        missing.push(`Company: "${exp.company}"`);
      }
      if (exp.role && !lowerExtracted.includes(exp.role.toLowerCase())) {
        missing.push(`Role: "${exp.role}"`);
      }
    });

    // Check Skills
    (structuredData.skills || []).forEach((group) => {
      (group.items || []).forEach((skill) => {
        if (skill && !lowerExtracted.includes(skill.toLowerCase())) {
          missing.push(`Skill: "${skill}"`);
        }
      });
    });

    report.missingText = missing;

    // Fact 4: Check Reading Order
    const summaryPos = lowerExtracted.indexOf("summary");
    const expPos = lowerExtracted.indexOf("experience");
    const eduPos = lowerExtracted.indexOf("education");

    if (expPos !== -1 && eduPos !== -1) {
      report.readingOrderMatches = expPos < eduPos || summaryPos < expPos;
    } else {
      report.readingOrderMatches = true;
    }

    // Fact 5: Problematic Structure
    const hasNonPrintable = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(extractedText);
    report.hasProblematicStructure = hasNonPrintable || missing.length > 5;

    return report;
  } catch (err) {
    console.error("Parseability validation error:", err);
    report.missingText.push(`Extraction failed: ${err.message}`);
    return report;
  }
}
