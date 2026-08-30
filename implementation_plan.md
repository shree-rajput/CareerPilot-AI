# CareerPilot AI — Production-Grade Transformation Plan

This document outlines the strategic roadmap for transforming CareerPilot AI into a trustworthy, AI-powered Career Intelligence Platform. It directly addresses the 42 critical engineering, product, and UX requirements to shift the application from a collection of basic features into a robust, interconnected system.

## 🎯 Product Vision
**"Given who I am, what I am targeting, what I have done, and where I stand — what should I do next to maximize my placement probability?"**

We are shifting from isolated CRUD features into an **AI Placement Operating System** with a unified Career Graph, Explainable AI, Zero-Trust Data Validation, and a true Intelligence Layer.

---

## 🔍 Execution Phases

### Phase 1: Complete Codebase Audit & Bug Discovery
Before writing new features, we must secure the foundation.
- **Frontend Audit:** Identify race conditions, duplicate components, hardcoded values, missing loading/error states, and inconsistent styling across all major pages (Dashboard, Applications, Interviews, Resumes).
- **Backend Audit:** Identify N+1 queries, swallowed exceptions, unhandled promises, and invalid MongoDB state mutations (e.g., preventing NaN/undefined leakage).
- **Security & Trust Check:** Review JWT strategies, authorization boundaries, and prompt-injection vulnerabilities.
- **Action:** Deliver an audit report of critical vulnerabilities and immediate fixes.

### Phase 2: Data Integrity & API Contract Consistency
Implement Zero-Trust Validation across all boundaries.
- **Strict Validation:** Enhance Zod validators for all incoming API payloads. Ensure Mongoose schemas match validation schemas perfectly (addressing issues like the recent `targetRoles` mismatch).
- **Safe Math Utilities:** Enforce strict normalization for all numeric calculations (Readiness, ATS scores). Scores will never persist as `NaN` or `undefined`.
- **API Response Standardization:** Wrap all API responses in a consistent `{ success, data, error: { code, message, details }, requestId }` structure.

### Phase 3: AI Reliability & Control Layer
AI must become a controlled subsystem, not a raw API call.
- **Orchestration Pipeline:** Implement a strict pipeline: Context Builder → AI Request → Structured Output (JSON Mode) → Schema Validation → Business Rule Check → Persistence.
- **Resilience:** Add timeouts, retries, and fallback deterministic mechanisms for when AI providers (like Groq) fail.
- **Explainability:** Ensure all AI outputs return evidence and reasoning, rather than arbitrary numbers. Hallucinated resume content will be strictly prevented.

### Phase 4: Career Intelligence Foundation (Career Graph)
Connect the currently siloed entities into a unified intelligence graph.
- **Centralized Profile:** Link Skills, Projects, Resume Versions, Applications, and Interviews to a unified User Career State.
- **Readiness Engine:** Rebuild the Career Readiness Score as a transparent, reproducible, deterministic calculation with historical tracking (Readiness History).

### Phase 5: Resume Intelligence Upgrade
Transform the resume parser into a professional document system.
- **Version Control:** Implement Resume Lineage (Master vs. Role-specific), supporting duplication, comparison (Diff system with Accept/Reject), and archiving.
- **Live Tailoring Editor:** Create a three-pane UI (Original, AI Editor, Live Intelligence) for real-time, deterministic JD alignment without excessive AI calls.
- **Resilient Parsing:** Ensure PDF/DOCX/TXT parsing handles corrupt/large files gracefully without silently failing.

### Phase 6: Application CRM & Intelligence
Upgrade the application tracker from a simple table to a fully-fledged CRM.
- **Rich Tracking:** Add tracking for Salary, Job URL, Source, Follow-ups, and Contacts.
- **Timeline Engine:** Track every state transition (Saved → Applied → OA → Interview) as an auditable timeline event.
- **Application Health:** Calculate a composite health score based on Resume compatibility, Skill match, Deadline risk, and Interview readiness.

### Phase 7: Interview Intelligence Upgrade
Create a truly adaptive AI interviewer.
- **Memory & Context:** Interviews will adapt based on previous weak areas, repeated mistakes, and specific JD requirements.
- **Professional Reporting:** Generate post-interview reports with concrete evidence mapped to the user's answers, avoiding generic coaching.

### Phase 8: Preparation & Next Best Action Engine
Shift from static checklists to dynamic strategy.
- **Next Best Action:** Generate prioritized, evidence-based recommendations (e.g., *High Priority: Practice React hooks because of weak performance in your last 3 technical sessions*).
- **Dynamic Prep Plans:** Auto-generate 7-day adaptive preparation schedules based on upcoming interview deadlines and identified skill gaps.

### Phase 9: Dashboard & UX Redesign (Command Center)
- **Dashboard Upgrade:** Redesign the dashboard into a "Career Command Center" focusing on "What should I do today?", recent progress, and pipeline health.
- **Design System:** Standardize typography, cards, buttons, and empty/error states across the application to ensure a premium, visually coherent SaaS feel.
- **Application Detail UX:** Refactor `ApplicationDetailPage.jsx` to use clean tabs and an intuitive layout rather than a massive information dump.

### Phase 10: Testing, Performance & Security Hardening
- **Observability:** Implement structured logging and request IDs across the stack. Ensure no sensitive PII or secrets are logged.
- **Testing:** Write integration tests for critical paths: Auth, Application Transitions, Match Scoring, and AI Validation boundaries.
- **Performance:** Optimize database queries (indexing), remove frontend re-render storms, and debounce expensive calculations.

---

## 🚦 User Review Required

Does this 10-phase execution plan accurately reflect your vision for the CareerPilot AI Production-Grade Transformation? 

If approved, I will immediately commence **Phase 1 (Complete Codebase Audit & Bug Discovery)** and begin executing the deep architectural review of the repository.
