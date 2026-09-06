import { EventEmitter } from "events";

/**
 * CareerPilot Domain Event Engine
 * Lightweight, in-memory Node.js EventEmitter instance for decoupling application workflows.
 * 
 * Supported Domain Events:
 *  - APPLICATION_INTERVIEW_SCHEDULED: { userId, applicationId, company, role, date }
 *  - INTERVIEW_COMPLETED: { userId, sessionId, overallScore, weakTopics, strongTopics }
 *  - PROJECT_CREATED: { userId, projectId, name, technologies }
 *  - SKILL_VERIFIED: { userId, skillName, score }
 *  - RESUME_TAILORED: { userId, resumeId, targetRole }
 */
class DomainEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(30);
  }
}

export const domainEvents = new DomainEvents();

// Domain Event Constants
export const DOMAIN_EVENTS = {
  APPLICATION_INTERVIEW_SCHEDULED: "APPLICATION_INTERVIEW_SCHEDULED",
  INTERVIEW_COMPLETED: "INTERVIEW_COMPLETED",
  PROJECT_CREATED: "PROJECT_CREATED",
  SKILL_VERIFIED: "SKILL_VERIFIED",
  RESUME_TAILORED: "RESUME_TAILORED"
};
