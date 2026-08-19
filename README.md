# CareerPilot AI 🚀

**An AI-powered career intelligence platform for job matching, resume optimization, application tracking, and interview preparation.**

CareerPilot AI is built as a complete end-to-end SaaS application designed to help job seekers land roles. It solves the entire journey: from parsing resumes and extracting job requirements, to scoring semantic matches deterministically, tailoring resumes without hallucinating, tracking progress via Kanban, and finally practicing through an adaptive AI mock interviewer.

---

## ✨ Features

- **Resume Intelligence**: Parses PDF files locally using `pdfjs-dist`, extracts structure using LLMs, and validates with `zod`. Keeps full version history with diffs.
- **Job Description Parsing**: Converts raw job descriptions into structured requirements (Must haves, nice-to-haves, tools, etc.).
- **Semantic Match Engine (Zero-Cost Local AI)**: Uses `@xenova/transformers` (all-MiniLM-L6-v2) directly on the Node backend to generate embeddings and calculate Cosine Similarity. The Match Score is calculated deterministically through weights, not hallucinated by an LLM.
- **Resume Tailoring**: Context-aware AI suggestions that highlight relevant experience without inventing fake skills.
- **Application Tracker**: Full Kanban board using `@dnd-kit` with optimistic UI updates and timeline tracking.
- **Live Analytics**: Aggregation pipelines calculating response rates, interview conversion rates, and skill gaps (Recharts).
- **AI Mock Interviewer**: Adaptive, real-time voice interviews. Utilizes browser `SpeechRecognition` to transcribe answers. The AI evaluates technical accuracy, structure (e.g. STAR method), and communication metrics (pace, filler words), and offers a "Better Answer" coach.
- **Strict Free-Tier Architecture**: Built with a strict $0 budget constraint. Implements Groq API (free-tier), local NLP transformers, browser-side APIs (WebSpeech), and custom MongoDB limits to protect quotas.

---

## 🏗 Architecture

### Tech Stack
- **Frontend**: React 18, Vite, React Router, Recharts, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express.js, MongoDB + Mongoose
- **AI Models**: 
  - Text & Reasoning: **Groq API** (`llama-3.1-8b-instant`)
  - Embeddings: Local **Transformers.js** (`Xenova/all-MiniLM-L6-v2`)
  - Speech-to-Text: Browser native **Web Speech API**

### Core Engineering Principles
1. **AI Safety Pipeline**: `LLM → JSON Extractor → Zod Validation → DB`. Never trust raw LLM outputs.
2. **Deterministic Matching**: LLMs are great for reasoning but bad at objective scoring. We use LLMs to extract features, Transformers to calculate semantic similarity, and standard Math for the final score.
3. **Usage Limits**: Real SaaS products rate-limit. We implement a custom MongoDB-backed `AIUsage` model that limits daily AI inferences to protect free-tier quotas.
4. **Resilience**: The AI layer uses graceful degradation and automated retry loops.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account (Free tier)
- Groq API Key (Free tier)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/careerpilot-ai.git
cd careerpilot-ai
npm run install:all
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
From the root directory:
```bash
npm run dev
```
- Client runs on `http://localhost:5173`
- Server runs on `http://localhost:5000`

---

## 🧠 System Design Highlights (For Interviews)

If you're reading this code to understand how it's built, here are key systems to look at:
- **`server/src/services/ai/aiService.js`**: The central AI orchestration layer proving safe LLM execution patterns.
- **`server/src/services/matching/matchEngine.js`**: Demonstrates applied ML in production by combining local NLP embeddings with backend business logic.
- **`server/src/controllers/interviewController.js`**: The state machine driving the adaptive interview loop.
- **`server/src/utils/aiUsage.js`**: How to implement production rate-limiting and quota tracking gracefully.

---

## 🔒 Security
- Passwords hashed with `bcryptjs`.
- Auth tokens managed securely via `jsonwebtoken`.
- Headers secured with `helmet`.
- Endpoint rate-limiting via `express-rate-limit`.
- Payload sizes capped to prevent DoS via massive text dumps.
- All AI responses validated dynamically to prevent NoSQL injection via LLM hallucinations.
