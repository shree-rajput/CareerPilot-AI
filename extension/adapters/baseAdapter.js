import { cleanText, sanitizeJobUrl } from "../utils/sanitizer.js";

export class BaseAdapter {
  constructor(sourceName) {
    this.sourceName = sourceName;
  }

  calculateConfidence(data) {
    let score = 0;
    if (data.title && data.title.length > 2) score += 35;
    if (data.company && data.company.length > 1) score += 25;
    if (data.description && data.description.length >= 100) score += 30;
    if (data.location) score += 10;

    if (score >= 80) return "HIGH";
    if (score >= 50) return "MEDIUM";
    return "LOW";
  }

  createNormalizedPayload(data = {}) {
    const rawUrl = data.url || window.location.href;
    const cleanUrl = sanitizeJobUrl(rawUrl);

    const payload = {
      source: this.sourceName,
      externalJobId: data.externalJobId || "",
      title: cleanText(data.title || ""),
      company: cleanText(data.company || ""),
      location: cleanText(data.location || ""),
      url: cleanUrl,
      description: cleanText(data.description || ""),
      employmentType: cleanText(data.employmentType || ""),
      seniority: cleanText(data.seniority || ""),
      salary: cleanText(data.salary || ""),
      workplaceType: cleanText(data.workplaceType || ""),
      postedAt: cleanText(data.postedAt || ""),
      skills: Array.isArray(data.skills) ? data.skills.map(cleanText).filter(Boolean) : [],
      experienceRequirements: cleanText(data.experienceRequirements || ""),
      applicationMethod: cleanText(data.applicationMethod || "external"),
      externalApplyUrl: sanitizeJobUrl(data.externalApplyUrl || cleanUrl),
      extractionConfidence: "LOW",
    };

    payload.extractionConfidence = this.calculateConfidence(payload);
    return payload;
  }

  extract() {
    throw new Error("extract() must be implemented by adapter subclass.");
  }
}
