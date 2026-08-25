# CareerPilot AI Architecture Audit and Production Roadmap

Date: 2026-08-24

## Current Architecture

CareerPilot AI is a modular MERN monolith.

- `client/`: React, Vite, React Router, Axios, Recharts, browser speech/camera APIs.
- `server/`: Express API, JWT auth, Mongoose models, AI service abstraction, resume parsing, semantic matching, interview flows.
- `server/src/services/ai`: Groq-backed structured AI calls with JSON extraction and Zod validation.
- `server/src/services/matching`: local embedding pipeline and deterministic scoring.
- `server/src/services/resume`: PDF, DOCX, TXT parsing plus version diff/tailoring helpers.
- `server/src/services/career`: deterministic career intelligence aggregation.

## Database Map

- `User`: authentication, education, target roles, skills, interview preferences.
- `Resume`: uploaded resume versions, raw text, structured data, storage URL metadata.
- `Application`: company, role, JD, extracted JD, status, history, resume/match links.
- `MatchResult`: deterministic score, category scores, matched/partial/missing skills, evidence.
- `InterviewSession`: target role, stack, JD context, session status, rolling scores.
- `InterviewQuestion`: asked questions, transcripts, answer analysis, communication metrics, AI/fallback source metadata.
- `AIUsage`: daily per-user AI usage counters.

## API Map

- Auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Profile: `/api/profile`
- Resume: `/api/resume`, `/api/resume/upload`, `/api/resume/:id`, `/api/resume/:id/versions`, `/api/resume/:id/restore`, `/api/resume/diff`
- Applications: `/api/applications`, `/api/applications/:id`, `/api/applications/:id/intelligence`
- Match: `/api/match`, `/api/match/:id`
- Tailoring: `/api/tailor`
- Analytics: `/api/analytics/dashboard`, `/api/analytics/trends`, `/api/analytics/distribution`, `/api/analytics/career-intelligence`
- Interview: `/api/interview`, `/api/interview/:sessionId/question`, `/api/interview/question/:questionId/answer`, `/api/interview/:sessionId/complete`, `/api/interview/:sessionId/report`

## Feature Status

- Authentication: Working foundation. Needs refresh-token strategy and stronger session management before production.
- Profile/settings: Working basic persistence. Needs richer career graph fields.
- Resume upload/parsing: Repaired for PDF/DOCX/TXT buffer parsing. Cloudinary is now non-fatal after text extraction. AI structuring has local fallback.
- Resume versions: Partially working. Basic lineage/diff exists; rollback/version tree UX needs hardening.
- JD extraction: Partially working. AI failures are non-fatal on application create, but deterministic local extraction fallback should be added.
- Semantic matching: Partially working. Deterministic scoring exists, but embedding model download/cache needs deployment planning.
- Application tracker: Working basic CRUD/status persistence. Needs expanded CRM fields, filters, pagination, and timeline.
- Application intelligence: Working deterministic assistant based on existing resume/match data.
- Analytics: Working basic aggregation. Needs richer funnel/time-to-response analytics and empty-state polish.
- AI interviewer: Repaired for model config and fallback reliability. Still needs real adaptive difficulty and stronger session recovery UX.
- Camera/microphone: Partially working. Browser camera preview and speech recognition exist; video metrics are not production-grade and must not be presented as psychological confidence.

## Critical Problems Found

1. Groq default model was deprecated.
   Root cause: `.env.example` defaulted to `llama-3.1-8b-instant`, which Groq shut down for free/developer tier on 2026-08-16.
   Fix: default model changed to `openai/gpt-oss-20b`.

2. AI structured calls did not request JSON mode.
   Root cause: prompts asked for JSON, but provider requests allowed normal prose.
   Fix: `groqChat` now supports `jsonMode` and structured AI calls use JSON object mode.

3. Interview questions failed hard when AI was unavailable.
   Root cause: no deterministic fallback after provider/model/config/JSON failure.
   Fix: interview question and answer evaluation now return labeled deterministic fallbacks and persist their source.

4. Resume upload was too brittle for local development.
   Root cause: Cloudinary storage failure blocked an otherwise parsed resume.
   Fix: Cloudinary is non-fatal after text extraction; parsed raw text and local structured data are still saved.

5. Resume parser logs exposed document content.
   Root cause: PDF parser printed extracted resume preview to server logs.
   Fix: removed resume text preview/debug logging.

## Production Roadmap

### Phase 1: Foundation Hardening

- Add request IDs and consistent `{ success, data, error }` API responses.
- Add pagination/filter validation to list endpoints.
- Add refresh tokens or secure cookie session strategy.
- Add ownership checks consistently for all referenced IDs.
- Add integration tests for auth, resume upload, applications, match, and interview.

### Phase 2: Unified Career Profile

- Add a `CareerProfile` model or derived materialized profile.
- Normalize skills with category, evidence, proficiency, source, and last-used metadata.
- Connect resume, applications, matches, and interviews into one career graph.

### Phase 3: Resume Intelligence

- Add resume health scoring: ATS, readability, impact, redundancy, weak bullets, missing evidence.
- Add deterministic local JD/resume keyword extraction fallback.
- Improve version lineage into a tree, not only parent chains.

### Phase 4: Job and Matching Intelligence

- Expand job intelligence fields: must-have, nice-to-have, differentiators, deal breakers.
- Upgrade match scoring dimensions: skill, semantic, project, experience, education, location, seniority, keyword coverage.
- Cache embeddings by text hash.

### Phase 5: Application CRM

- Add recruiter, referral, source, deadline, follow-up date, salary, location, and round timeline.
- Add reminders through a notification abstraction.
- Add search/filter/pagination.

### Phase 6: Interview Intelligence

- Use resume/JD/career-profile context retrieval for question generation.
- Generate follow-ups based on answer weakness and prior evaluations.
- Replace simulated video presence with real observable browser metrics or remove the metric.
- Add report-level topic recommendations and trend tracking.

### Phase 7: Production Infrastructure

- Add Docker dev/prod setup.
- Add CI with lint, build, and tests.
- Add health/readiness checks.
- Add structured logs and AI latency/error tracking.

## Immediate Next Repairs

1. Add deterministic JD extraction fallback.
2. Add API response consistency and request IDs.
3. Add unit tests for resume parser, JSON extraction, fallback interview generation, and scoring.
4. Add route-level lazy loading to reduce the frontend bundle size.
5. Replace browser-only interview state assumptions with a session resume endpoint.
