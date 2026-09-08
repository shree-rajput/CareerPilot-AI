# CareerPilot AI 🚀

**An AI-powered career intelligence platform for job matching, resume optimization, application tracking, interview preparation, and community mentorship.**

CareerPilot AI is built as a complete end-to-end SaaS application designed to help job seekers land roles. It has evolved from a basic resume parser into a comprehensive "Career Operating System" with a unified intelligence graph, real-time collaboration, and an embedded AI Copilot.

---

## ✨ Features (Frontend Verified)

Based on the actual working client application, CareerPilot AI is structured into the following core modules:

### 1. Command Center
- **Dashboard:** Your central hub for tracking upcoming interviews, recent application updates, and quick actions to drive your job search forward.
- **Global Command Palette:** Hit `Ctrl+K` from anywhere in the app to quickly jump between features or search for tools.
- **Floating AI Copilot:** An always-available AI assistant (accessible via the floating chat widget or a dedicated page) to help you navigate the app, generate emails, or ask career questions.

### 2. Career Management
- **Job Inbox:** Connects and categorizes incoming emails regarding job applications, offers, and interview invites.
- **Resume Intelligence & Studio:** A dedicated workspace to build, edit, and tailor your resume. Features live AI suggestions that highlight relevant experience for specific roles without hallucinating fake skills. Supports version control (Master vs. role-specific resumes).
- **Job Board:** A built-in system to ingest and search for jobs, calculating deterministic semantic match scores (using local `Transformers.js`) to see how well you fit a role.
- **Applications (CRM):** A full Kanban board (`@dnd-kit`) with optimistic UI updates and timeline tracking to manage your pipeline from "Saved" to "Offer."
- **Projects:** Track your portfolio projects and easily map them to resume highlights.

### 3. Preparation
- **Preparation Plan:** Adaptive preparation schedules based on your upcoming interviews and identified skill gaps. (Note: Standalone coding pages have been unified into this central preparation flow).
- **Tech Discussion Rooms:** Real-time collaborative rooms (replacing basic peer interviews) to debate technical architectures, practice system design, and communicate with peers.
- **AI Interviewer:** Adaptive, real-time voice interviews. The AI dynamically generates questions based on your resume and target job, listens via your microphone, and evaluates technical accuracy, structure (e.g., STAR method), and communication metrics (pace, filler words).
- **Interview History:** Review reports, replays, and transcripts from all your past AI and peer sessions.

### 4. Growth & Network
- **Mentor Connect:** A platform to find and connect with industry professionals.
- **Mentor Dashboard:** Tools for mentors to manage incoming requests, schedule sessions, and host 1:1 real-time video/chat rooms (`MentorSessionRoomPage`).
- **Analytics:** Visual aggregations calculating response rates, interview conversion rates, and pipeline health using Recharts.

### 5. System Integrations
- **Browser Extension:** Seamlessly authorize and connect a browser extension (`/extension/connect`) to bring CareerPilot intelligence (like auto-filling or matching) directly to external job boards and Gmail.
- **Notification Center:** Real-time alerts for incoming emails, mentor requests, and approaching deadlines.

---

## 🏗 Architecture

### Tech Stack
- **Frontend**: React 18, Vite, React Router, Recharts, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express.js, MongoDB + Mongoose, WebSockets (for live Tech Discussion & Mentor rooms)
- **AI Models**: 
  - Text & Reasoning: **Groq API** (`llama-3.1-8b-instant`)
  - Embeddings: Local **Transformers.js** (`Xenova/all-MiniLM-L6-v2`)
  - Speech-to-Text: Browser native **Web Speech API**
- **Package Manager**: pnpm (configured as a monorepo workspace)

### Core Engineering Principles
1. **AI Safety Pipeline**: `LLM → JSON Extractor → Zod Validation → DB`. Never trust raw LLM outputs.
2. **Deterministic Matching**: We use local Transformers to calculate semantic similarity and standard Math for the final score, avoiding LLM hallucinations for objective metrics.
3. **Real-time Collaboration**: Heavy use of WebSockets for Peer Interviews, Mentorship Rooms, and Tech Discussions.
4. **Strict Free-Tier Architecture**: Built with a strict $0 budget constraint, relying on local NLP and free-tier APIs with database-level quota tracking.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- MongoDB Atlas Account
- Groq API Key

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/careerpilot-ai.git
cd careerpilot-ai
pnpm install
```

### 2. Environment Setup
Copy the example environment file in the server:
```bash
cd server
cp .env.example .env
```
Fill in `.env` with your keys:
- `MONGODB_URI`: Your Atlas connection string
- `GROQ_API_KEY`: Your Groq console API key
- `JWT_ACCESS_SECRET`: A long random string

### 3. Run Development Servers
From the root directory, the monorepo is managed by pnpm:
```bash
pnpm run dev
```
- Client runs on `http://localhost:5173`
- Server runs on `http://localhost:5000`

---

## 🔒 Security
- Passwords hashed with `bcryptjs`.
- Auth tokens managed securely via `jsonwebtoken`.
- Payload sizes capped to prevent DoS via massive text dumps.
- All AI responses validated dynamically to prevent NoSQL injection via LLM hallucinations.

- IMP Drive links (must check them out)
- 1-https://docs.google.com/document/u/1/...
- 2-https://docs.google.com/document/d/e/...
- 3-https://docs.google.com/document/d/e/...