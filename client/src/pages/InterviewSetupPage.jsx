import React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mic, Target, Plus, X, BrainCircuit } from "lucide-react";
import { interviewApi } from "../api/interview.js";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

export function InterviewSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [fetchingSessions, setFetchingSessions] = useState(true);

  const initialSkill = searchParams.get("skill");

  const [form, setForm] = useState({
    targetRole: "",
    technologyStack: initialSkill ? [initialSkill] : [],
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
      setFetchingSessions(true);
      const data = await interviewApi.listSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingSessions(false);
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
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-text tracking-tight">AI Mock Interview</h1>
        <p className="text-text-secondary text-sm mt-1">Practice for your target role with adaptive questions and real-time analysis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* NEW SESSION FORM */}
        <Card className="shadow-sm border-border">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
            <div className="bg-primary/10 p-1.5 rounded-md text-primary">
              <Target size={18} />
            </div>
            <CardTitle className="text-lg m-0">New Interview Session</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-text-secondary mb-6">
              Configure the AI interviewer's persona and focus areas.
            </p>

            <form onSubmit={handleStart} className="flex flex-col gap-5">
              <Input
                label="Target Role"
                placeholder="e.g. Frontend Developer, Data Scientist..."
                value={form.targetRole}
                onChange={e => setForm({ ...form, targetRole: e.target.value })}
                required
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Technology Stack</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-1 bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                    placeholder="e.g. React, Node.js"
                    value={techInput}
                    onChange={e => setTechInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTech(e)}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTech} className="px-3">
                    <Plus size={18} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.technologyStack.map(tech => (
                    <span key={tech} className="bg-surface border border-border text-text-secondary text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                      {tech}
                      <X size={14} className="cursor-pointer hover:text-danger transition-colors" onClick={() => handleRemoveTech(tech)} />
                    </span>
                  ))}
                  {form.technologyStack.length === 0 && (
                    <span className="text-xs text-text-secondary italic">No technologies added yet.</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Interview Type</label>
                  <select
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none cursor-pointer text-sm"
                    value={form.interviewType}
                    onChange={e => setForm({ ...form, interviewType: e.target.value })}
                  >
                    <option value="mixed">Mixed</option>
                    <option value="technical">Technical Focus</option>
                    <option value="hr">Behavioral (HR)</option>
                    <option value="project">Project Deep Dive</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Difficulty</label>
                  <select
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none cursor-pointer text-sm"
                    value={form.difficulty}
                    onChange={e => setForm({ ...form, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy (Intern/Junior)</option>
                    <option value="medium">Medium (Mid-level)</option>
                    <option value="hard">Hard (Senior)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Job Description (Optional)</label>
                <textarea
                  className="w-full bg-white border border-border rounded-lg p-3 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  placeholder="Paste the job description here for highly targeted questions..."
                  value={form.jobDescription}
                  onChange={e => setForm({ ...form, jobDescription: e.target.value })}
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-700">Number of Questions</label>
                  <span className="text-sm font-bold text-primary bg-info-bg px-2 py-0.5 rounded border border-blue-200">
                    {form.numberOfQuestions}
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={form.numberOfQuestions}
                  onChange={e => setForm({ ...form, numberOfQuestions: Number(e.target.value) })}
                  className="w-full mt-2 accent-primary"
                />
              </div>

              <Button type="submit" isLoading={loading} className="w-full mt-2 h-12 text-base">
                {!loading && <Mic size={18} className="mr-2" />}
                {loading ? "Initializing..." : "Start Mock Interview"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* PAST SESSIONS */}
        <Card className="shadow-sm border-border">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
            <div className="bg-purple-100 p-1.5 rounded-md text-purple-600">
              <BrainCircuit size={18} />
            </div>
            <CardTitle className="text-lg m-0">Previous Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col gap-3 max-h-[600px] overflow-y-auto">
            {fetchingSessions ? (
              <div className="flex justify-center items-center py-8 text-text-secondary text-sm font-medium">
                <Spinner size="md" className="mr-2" /> Loading sessions...
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-text-secondary text-sm italic text-center py-8">No past sessions found.</p>
            ) : (
              sessions.map(session => (
                <div 
                  key={session._id} 
                  className="flex justify-between items-center p-4 rounded-xl border border-border bg-surface hover:bg-bg-secondary hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/interview/${session._id}/report`)}
                >
                  <div className="flex flex-col">
                    <strong className="text-text text-sm mb-1 group-hover:text-primary transition-colors">{session.targetRole}</strong>
                    <span className="text-xs text-text-secondary font-medium">
                      {new Date(session.createdAt).toLocaleDateString()} • <span className="capitalize">{session.interviewType}</span>
                    </span>
                  </div>
                  <div 
                    className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                      session.overallScore >= 70 ? 'bg-success-bg text-success border-success/20' : 
                      session.overallScore >= 50 ? 'bg-warning-bg text-warning border-warning/20' : 
                      'bg-danger-bg text-danger border-danger/20'
                    }`}
                  >
                    {Math.round(session.overallScore)} / 100
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
