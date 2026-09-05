import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mic, Target, Plus, X, BrainCircuit, ArrowRight } from "lucide-react";
import { interviewApi } from "../api/interview.js";
import { toast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { useAuth } from "../context/useAuth";

export function InterviewSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [fetchingSessions, setFetchingSessions] = useState(true);

  const initialSkill = searchParams.get("skill");

  const primaryRole = (user?.targetRoles || []).find(r => r.isPrimary) || user?.targetRoles?.[0];
  const defaultTechs = initialSkill 
    ? [initialSkill] 
    : (primaryRole?.techStack?.length > 0 ? primaryRole.techStack : (user?.technicalSkills || []).slice(0, 4));

  const [form, setForm] = useState({
    targetRole: primaryRole?.title || "",
    technologyStack: defaultTechs,
    interviewType: user?.interviewPreferences?.defaultInterviewType || "mixed",
    difficulty: user?.interviewPreferences?.defaultDifficulty || "medium",
    candidateExperience: "fresher", // fresher (0-1 YOE) | junior (1-2 YOE)
    enableVideoPresence: true,
    jobDescription: "",
    numberOfQuestions: 5
  });

  useEffect(() => {
    if (user && !form.targetRole) {
      setForm(prev => ({
        ...prev,
        targetRole: primaryRole?.title || prev.targetRole,
        technologyStack: prev.technologyStack.length > 0 ? prev.technologyStack : defaultTechs,
        interviewType: user?.interviewPreferences?.defaultInterviewType || prev.interviewType,
        difficulty: user?.interviewPreferences?.defaultDifficulty || prev.difficulty
      }));
    }
  }, [user]);

  const [techInput, setTechInput] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setFetchingSessions(true);
      const data = await interviewApi.listSessions();
      setSessions(data || []);
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
    if (!form.targetRole.trim()) return toast.warning("Target role is required");

    try {
      setLoading(true);
      const session = await interviewApi.createSession(form);
      navigate(`/interview/${session._id}`);
    } catch (err) {
      toast.error("Failed to start session: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            AI Voice & Video Interviewer
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Solo Technical Interview Practice</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Simulate real interview environments with AI-driven adaptive question prompts and scoring for students & freshers.
          </p>
        </div>
        <Button 
          type="button" 
          variant="secondary" 
          size="sm"
          onClick={() => navigate('/interview-history')}
          className="flex items-center gap-1.5"
        >
          <BrainCircuit size={14} className="text-primary" />
          <span>View History & Progress</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* NEW SESSION FORM */}
        <Card>
          <CardHeader className="py-3.5 px-5">
            <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
              <Target size={15} className="text-primary" /> Session Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleStart} className="space-y-4">
              <Input
                label="Target Role Title *"
                placeholder="e.g. Senior Frontend Engineer"
                value={form.targetRole}
                onChange={e => setForm({ ...form, targetRole: e.target.value })}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Technology Stack</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-1 bg-surface border border-border rounded-lg h-9 px-3 text-xs text-text placeholder-text-muted focus:border-primary outline-none"
                    placeholder="e.g. React, Node.js"
                    value={techInput}
                    onChange={e => setTechInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTech(e)}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddTech}>
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.technologyStack.map(tech => (
                    <span key={tech} className="bg-bg-secondary border border-border text-text text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                      {tech}
                      <X size={12} className="cursor-pointer text-text-muted hover:text-danger" onClick={() => handleRemoveTech(tech)} />
                    </span>
                  ))}
                  {form.technologyStack.length === 0 && (
                    <span className="text-xs text-text-muted italic">No technologies specified.</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Candidate Experience</label>
                  <select
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2.5 text-xs font-semibold text-text outline-none cursor-pointer"
                    value={form.candidateExperience}
                    onChange={e => setForm({ ...form, candidateExperience: e.target.value })}
                  >
                    <option value="fresher">Student / Fresher (0–1 YOE)</option>
                    <option value="junior">Junior Developer (1–2 YOE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Interview Format</label>
                  <select
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2.5 text-xs font-semibold text-text outline-none cursor-pointer"
                    value={form.interviewType}
                    onChange={e => setForm({ ...form, interviewType: e.target.value })}
                  >
                    <option value="mixed">Mixed (Technical + Behavioral)</option>
                    <option value="technical">Technical Focus</option>
                    <option value="hr">Behavioral (HR)</option>
                    <option value="project">Project Architecture</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Difficulty</label>
                <select
                  className="w-full bg-surface border border-border rounded-lg h-9 px-2.5 text-xs font-semibold text-text outline-none cursor-pointer"
                  value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="easy">Easy (Fundamentals & Conceptual)</option>
                  <option value="medium">Medium (Standard Practical Interview)</option>
                  <option value="hard">Hard (Advanced Edge Cases)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Job Description (Optional)</label>
                <textarea
                  className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-text placeholder-text-muted focus:border-primary outline-none"
                  placeholder="Paste Job Description (JD) to tailor questions to requested skills..."
                  value={form.jobDescription}
                  onChange={e => setForm({ ...form, jobDescription: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-bg-secondary rounded-lg border border-border">
                <input
                  type="checkbox"
                  id="enableVideoPresence"
                  checked={form.enableVideoPresence}
                  onChange={e => setForm({ ...form, enableVideoPresence: e.target.checked })}
                  className="rounded accent-primary"
                />
                <label htmlFor="enableVideoPresence" className="text-xs font-semibold text-text cursor-pointer">
                  Enable Browser-Side Video Presence Coaching (Eye contact, posture notes)
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-text-secondary">Questions Count</label>
                  <span className="text-xs font-bold text-primary">{form.numberOfQuestions}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={form.numberOfQuestions}
                  onChange={e => setForm({ ...form, numberOfQuestions: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>

              <Button type="submit" isLoading={loading} className="w-full">
                <Mic size={15} />
                <span>Start Practice Session</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* PAST SESSIONS */}
        <Card>
          <CardHeader className="py-3.5 px-5">
            <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
              <BrainCircuit size={15} className="text-primary" /> Past Practice Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 max-h-[520px] overflow-y-auto">
            {fetchingSessions ? (
              <div className="flex justify-center items-center py-6">
                <Spinner size="md" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-text-muted text-xs italic text-center py-8">No past interview sessions logged.</p>
            ) : (
              sessions.map(session => (
                <div 
                  key={session._id} 
                  className="flex justify-between items-center p-3 rounded-lg border border-border bg-surface hover:bg-bg-secondary/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/interview/${session._id}/report`)}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-bold text-text truncate">{session.targetRole}</span>
                    <span className="text-[10px] text-text-muted font-mono mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString()} · <span className="capitalize">{session.interviewType}</span>
                    </span>
                  </div>
                  <Badge variant={session.overallScore >= 70 ? "success" : session.overallScore >= 50 ? "warning" : "danger"} size="xs">
                    {Math.round(session.overallScore)}/100
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
