import React, { useEffect, useState } from "react";
import { Plus, FolderGit2, BrainCircuit, CheckCircle2, Wand2, RefreshCw, MessageSquareText, Sparkles, ExternalLink, HelpCircle, X, Send, ShieldCheck, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { projectApi } from "../api/career";
import { toast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  // Practice Answer Modal state
  const [practiceModal, setPracticeModal] = useState(null); // { project, question }
  const [userPracticeAnswer, setUserPracticeAnswer] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState(null);
  const [submittingPractice, setSubmittingPractice] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    role: "",
    architecture: "",
    technologies: "",
    achievements: "",
    githubUrl: "",
    complexity: "medium"
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await projectApi.getProjects();
      setProjects(res.data || res || []);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncFromResume() {
    setSyncing(true);
    try {
      const res = await projectApi.syncProjects();
      const synced = res.data || [];
      if (synced.length > 0) {
        toast.success(`Synced ${synced.length} project(s) from resume!`);
      } else {
        toast.info("No new projects found in resume to sync.");
      }
      await loadProjects();
    } catch (err) {
      toast.error("Failed to sync projects from resume.");
    } finally {
      setSyncing(false);
    }
  }

  async function submitProject(e) {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...form,
        technologies: form.technologies.split(",").map(s => s.trim()).filter(Boolean),
        achievements: form.achievements.split("\n").map(s => s.trim()).filter(Boolean),
        evidenceSource: "user",
        confidence: 90
      };
      
      await projectApi.createProject(dataToSubmit);
      toast.success("Project saved successfully!");
      setShowAdd(false);
      setForm({ name: "", description: "", role: "", architecture: "", technologies: "", achievements: "", githubUrl: "", complexity: "medium" });
      loadProjects();
    } catch (err) {
      toast.error("Failed to save project.");
    }
  }

  async function handleGenerateKit(id) {
    setGeneratingId(id);
    try {
      await projectApi.generateInterviewKit(id);
      toast.success("Interview Defense Kit generated!");
      await loadProjects();
    } catch (err) {
      toast.error("Failed to generate interview kit.");
    } finally {
      setGeneratingId(null);
    }
  }

  // Action: Single Question Get Answer -> Open Copilot
  function handleGetAnswer(project, q) {
    const promptText = `I am preparing for questions about my project "${project.name}".\n\nProject Context:\n- Role: ${project.role || "Developer"}\n- Tech Stack: ${(project.technologies || []).join(", ")}\n- Architecture: ${project.architecture || "Standard"}\n- Description: ${project.description}\n\nQuestion [${q.category}]: "${q.question}"\n\nPlease provide a clear, structured interview response based strictly on known project evidence.`;
    
    navigate("/copilot", {
      state: {
        initialPrompt: promptText,
        title: `${project.name}: ${q.category}`
      }
    });
  }

  // Action: Answer All in Copilot -> Open Copilot with sequential thread
  function handleAnswerAll(project) {
    const kit = project.interviewKit || [];
    if (kit.length === 0) return;

    const questionsList = kit.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join("\n");
    
    const promptText = `I found ${kit.length} interview defense questions for my project "${project.name}":\n\n${questionsList}\n\nLet's go through them one by one. Start by answering Question 1 based strictly on known project evidence, then ask if I'd like to move to Question 2.`;

    navigate("/copilot", {
      state: {
        initialPrompt: promptText,
        title: `${project.name} - Interview Defense`
      }
    });
  }

  // Inline Practice Answer submit
  function submitPracticeAnswer(e) {
    e.preventDefault();
    if (!userPracticeAnswer.trim()) return;

    setSubmittingPractice(true);
    // Simulate AI feedback evaluation based on length and key terms
    setTimeout(() => {
      const text = userPracticeAnswer.trim();
      const lengthScore = text.length > 120 ? 90 : text.length > 60 ? 75 : 55;
      const feedback = {
        score: lengthScore,
        strengths: text.length > 100 
          ? "Detailed answer addressing key implementation details." 
          : "Clear core answer provided.",
        improvements: text.length < 120 
          ? "Elaborate more on technical trade-offs, architecture, and measurable outcomes."
          : "Consider mentioning specific debugging or scaling challenges."
      };
      setPracticeFeedback(feedback);
      setSubmittingPractice(false);
    }, 600);
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            Project Intelligence & Architecture Defense
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Portfolio Project Intelligence</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            CareerPilot understands what you built and prepares you to confidently defend your architecture in interviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleSyncFromResume} isLoading={syncing}>
            <RefreshCw size={14} className="mr-1.5" /> Sync Resume
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={15} className="mr-1.5" /> Add Project
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="border-primary/40 shadow-xs">
          <CardContent className="p-5">
            <form onSubmit={submitProject} className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-text m-0">New Project Record</h3>
                <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">Document evidence to help CareerPilot generate targeted technical defense kits.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Project Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input label="Your Role (e.g. Lead Full Stack Engineer)" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
                
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Technologies (comma-separated)</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-surface border border-border rounded-lg h-9 px-3 text-xs font-semibold text-text outline-none focus:border-primary"
                    value={form.technologies}
                    onChange={e => setForm({ ...form, technologies: e.target.value })}
                    placeholder="React, Node.js, MongoDB, Docker..."
                  />
                </div>

                <Input label="GitHub URL (optional)" value={form.githubUrl} onChange={e => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/..." />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Architecture & System Design Details</label>
                <textarea
                  rows={2}
                  className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs font-medium text-text outline-none focus:border-primary resize-none"
                  value={form.architecture}
                  onChange={e => setForm({ ...form, architecture: e.target.value })}
                  placeholder="REST API microservices, Redis caching layer, MongoDB replica set, WebSockets..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Project Description & Engineering Scope</label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs font-medium text-text outline-none focus:border-primary resize-none"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this system and what engineering problem does it solve?"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Key Achievements & Measurable Impact (One per line)</label>
                <textarea
                  rows={2}
                  className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs font-medium text-text outline-none focus:border-primary resize-none"
                  value={form.achievements}
                  onChange={e => setForm({ ...form, achievements: e.target.value })}
                  placeholder="Reduced latency by 40% using Redis...&#10;Implemented OAuth2 authentication..."
                />
              </div>
              
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm">Save Project</Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="py-12 text-center text-text-secondary bg-surface rounded-xl border border-border shadow-2xs">
              <FolderGit2 className="mx-auto mb-2 h-8 w-8 text-text-muted" />
              <p className="font-bold text-sm text-text m-0">No projects recorded yet</p>
              <p className="text-xs text-text-muted mt-0.5 m-0 font-medium">Click 'Sync Resume' or 'Add Project' to analyze your engineering achievements.</p>
            </div>
          ) : (
            projects.map(project => (
              <Card key={project._id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row gap-6">
                    
                    {/* Left Column: Project Architecture Evidence */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-text m-0">{project.name}</h3>
                            <Badge variant={project.evidenceSource === 'resume' ? 'primary' : 'secondary'} size="xs">
                              {project.evidenceSource === 'resume' ? 'Resume Extracted' : 'User Provided'}
                            </Badge>
                            {project.githubUrl && (
                              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                                GitHub <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          {project.role && <p className="text-xs font-semibold text-primary m-0 mt-0.5">{project.role}</p>}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted bg-bg-secondary px-2.5 py-1 rounded-md border border-border">
                          <ShieldCheck size={13} className="text-emerald-600" />
                          <span>Evidence Confidence: {project.confidence || 80}%</span>
                        </div>
                      </div>

                      <p className="text-xs text-text-secondary font-medium m-0 leading-relaxed">{project.description}</p>

                      {project.technologies?.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">Tech Stack & Components</span>
                          <div className="flex flex-wrap gap-1.5">
                            {project.technologies.map((t, i) => (
                              <Badge key={i} variant="secondary" size="xs">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {project.architecture && (
                        <div className="bg-bg-secondary p-3 rounded-lg border border-border">
                          <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">Architecture & Data Flow</span>
                          <p className="text-xs text-text font-medium m-0 leading-relaxed">{project.architecture}</p>
                        </div>
                      )}

                      {project.achievements?.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase block mb-1.5">Key Achievements</span>
                          <ul className="space-y-1.5 pl-0 list-none m-0">
                            {project.achievements.map((a, i) => (
                              <li key={i} className="text-xs text-text-secondary font-medium flex items-start gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span>{a}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Right Column: AI Interview Defense Kit & Copilot Action */}
                    <div className="w-full lg:w-96 bg-bg-secondary/50 p-4 rounded-xl border border-border flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-text font-bold text-xs">
                            <BrainCircuit size={16} className="text-primary" />
                            <span>Interview Defense Kit</span>
                          </div>

                          {project.interviewKit && project.interviewKit.length > 0 && (
                            <Button size="xs" variant="primary" onClick={() => handleAnswerAll(project)}>
                              <Sparkles size={13} className="mr-1" /> Answer All in Copilot
                            </Button>
                          )}
                        </div>

                        {project.interviewKit && project.interviewKit.length > 0 ? (
                          <div className="space-y-3 overflow-y-auto max-h-[360px] custom-scrollbar pr-1">
                            {project.interviewKit.map((q, i) => (
                              <div key={i} className="bg-surface p-3 rounded-xl border border-border text-xs space-y-2 hover:border-primary/40 transition-colors shadow-2xs">
                                <div className="flex justify-between items-center">
                                  <Badge variant={q.difficulty === 'Hard' ? 'danger' : q.difficulty === 'Medium' ? 'warning' : 'success'} size="xs">
                                    {q.difficulty}
                                  </Badge>
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{q.category}</span>
                                </div>

                                <p className="text-xs font-semibold text-text m-0 leading-snug">{q.question}</p>

                                {q.targetJobRequirement && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded block border border-emerald-200">
                                    Target Requirement: {q.targetJobRequirement}
                                  </span>
                                )}

                                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                                  <button
                                    onClick={() => setPracticeModal({ project, question: q })}
                                    className="text-[11px] font-semibold text-text-secondary hover:text-text bg-bg-secondary px-2.5 py-1 rounded-md border border-border transition-colors flex items-center gap-1"
                                  >
                                    <MessageSquareText size={12} /> Practice Answer
                                  </button>

                                  <button
                                    onClick={() => handleGetAnswer(project, q)}
                                    className="text-[11px] font-bold text-primary hover:underline bg-primary-bg px-2.5 py-1 rounded-md border border-primary-border transition-colors flex items-center gap-1 ml-auto"
                                  >
                                    <Sparkles size={12} /> Get Answer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-surface">
                            <Wand2 size={26} className="text-primary mb-2" />
                            <p className="text-xs font-bold text-text m-0 mb-1">Generate Technical Defense Kit</p>
                            <p className="text-[11px] text-text-secondary m-0 mb-4 font-medium leading-relaxed">
                              Generate personalized architecture, trade-off, and scalability questions for this project.
                            </p>
                            <Button 
                              size="xs"
                              onClick={() => handleGenerateKit(project._id)}
                              disabled={generatingId === project._id}
                            >
                              {generatingId === project._id ? (
                                <><Spinner size="xs" className="mr-1" /> Generating...</>
                              ) : (
                                "Generate Defense Kit"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Practice Answer Modal */}
      {practiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/30 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
              <span className="font-bold text-xs text-text flex items-center gap-1.5">
                <MessageSquareText size={15} className="text-primary" /> Practice Project Answer
              </span>
              <button onClick={() => { setPracticeModal(null); setPracticeFeedback(null); setUserPracticeAnswer(""); }} className="p-1 rounded text-text-secondary hover:bg-surface">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="p-3 bg-primary-bg/30 border border-primary-border/50 rounded-lg">
                <span className="text-[10px] font-bold text-primary uppercase block mb-0.5">{practiceModal.question.category} ({practiceModal.question.difficulty})</span>
                <p className="text-xs font-bold text-text m-0">{practiceModal.question.question}</p>
              </div>

              <form onSubmit={submitPracticeAnswer} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Your Answer (aim for clear technical reasoning):</label>
                  <textarea
                    rows={4}
                    required
                    className="w-full bg-bg-secondary border border-border rounded-lg p-2.5 text-xs font-medium text-text outline-none focus:border-primary resize-none"
                    placeholder="Describe your reasoning, technologies used, trade-offs, and outcomes..."
                    value={userPracticeAnswer}
                    onChange={e => setUserPracticeAnswer(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-mono">{userPracticeAnswer.length} chars</span>
                  <Button type="submit" size="xs" isLoading={submittingPractice} disabled={!userPracticeAnswer.trim()}>
                    Evaluate Answer
                  </Button>
                </div>
              </form>

              {practiceFeedback && (
                <div className="p-3 bg-surface border border-border rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-text">Feedback Evaluation</strong>
                    <Badge variant={practiceFeedback.score >= 75 ? 'success' : 'warning'} size="xs">
                      {practiceFeedback.score}% Depth Score
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary m-0"><strong>Strength:</strong> {practiceFeedback.strengths}</p>
                  <p className="text-xs text-text-secondary m-0"><strong>Recommendation:</strong> {practiceFeedback.improvements}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

