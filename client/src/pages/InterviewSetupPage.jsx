import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Target, Plus, X, BrainCircuit } from "lucide-react";
import { interviewApi } from "../api/interview.js";

export function InterviewSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);

  const [form, setForm] = useState({
    targetRole: "",
    technologyStack: [],
    interviewType: "technical",
    difficulty: "medium",
    jobDescription: "",
    numberOfQuestions: 5
  });

  const [techInput, setTechInput] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await interviewApi.listSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTech = (e) => {
    e.preventDefault();
    if (techInput.trim() && !form.technologyStack.includes(techInput.trim())) {
      setForm({ ...form, technologyStack: [...form.technologyStack, techInput.trim()] });
      setTechInput("");
    }
  };

  const handleRemoveTech = (tech) => {
    setForm({ ...form, technologyStack: form.technologyStack.filter(t => t !== tech) });
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.targetRole.trim()) return alert("Target role is required");

    try {
      setLoading(true);
      const session = await interviewApi.createSession(form);
      navigate(`/interview/${session._id}`);
    } catch (err) {
      alert("Failed to start session: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-layout">
      <div className="content-header">
        <div>
          <h2>AI Mock Interview</h2>
          <p>Practice for your target role with adaptive questions and real-time analysis.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div className="card">
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Target size={20} />
            New Interview Session
          </h3>
          <p className="text-secondary" style={{ marginBottom: "1.5rem" }}>
            Configure the AI interviewer's persona and focus areas.
          </p>

          <form onSubmit={handleStart} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="form-group">
              <label>Target Role</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Frontend Developer, Data Scientist..."
                value={form.targetRole}
                onChange={e => setForm({ ...form, targetRole: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Technology Stack</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. React, Node.js"
                  value={techInput}
                  onChange={e => setTechInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTech(e)}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddTech}>
                  <Plus size={18} />
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {form.technologyStack.map(tech => (
                  <span key={tech} className="skill-tag" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    {tech}
                    <X size={14} style={{ cursor: "pointer" }} onClick={() => handleRemoveTech(tech)} />
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Interview Type</label>
                <select
                  className="input-field"
                  value={form.interviewType}
                  onChange={e => setForm({ ...form, interviewType: e.target.value })}
                >
                  <option value="mixed">Mixed</option>
                  <option value="technical">Technical Focus</option>
                  <option value="hr">Behavioral (HR)</option>
                  <option value="project">Project Deep Dive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <select
                  className="input-field"
                  value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="easy">Easy (Intern/Junior)</option>
                  <option value="medium">Medium (Mid-level)</option>
                  <option value="hard">Hard (Senior)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Job Description (Optional)</label>
              <textarea
                className="input-field"
                placeholder="Paste the job description here for highly targeted questions..."
                value={form.jobDescription}
                onChange={e => setForm({ ...form, jobDescription: e.target.value })}
                rows={4}
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="form-group">
              <label>Number of Questions ({form.numberOfQuestions})</label>
              <input
                type="range"
                min="3"
                max="10"
                value={form.numberOfQuestions}
                onChange={e => setForm({ ...form, numberOfQuestions: Number(e.target.value) })}
                style={{ width: "100%" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Initializing..." : (
                <>
                  <Mic size={18} />
                  Start Mock Interview
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BrainCircuit size={20} />
            Previous Sessions
          </h3>

          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sessions.length === 0 ? (
              <p className="text-secondary text-center" style={{ padding: "2rem 0" }}>No past sessions found.</p>
            ) : (
              sessions.map(session => (
                <div key={session._id} className="match-card" onClick={() => navigate(`/interview/${session._id}/report`)} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ display: "block", marginBottom: "0.25rem" }}>{session.targetRole}</strong>
                      <span className="text-secondary" style={{ fontSize: "0.875rem" }}>
                        {new Date(session.createdAt).toLocaleDateString()} • {session.interviewType}
                      </span>
                    </div>
                    <div className="score-badge" style={{ backgroundColor: session.overallScore >= 70 ? 'var(--success-bg)' : 'var(--warning-bg)', color: session.overallScore >= 70 ? 'var(--success-color)' : 'var(--warning-color)' }}>
                      {Math.round(session.overallScore)} / 100
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
