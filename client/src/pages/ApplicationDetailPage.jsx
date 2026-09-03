import React, { useEffect, useState } from "react";
import { TriangleAlert, ArrowLeft, Sparkles, MapPin, Link as LinkIcon, History, Edit3, Save, CheckCircle, Target, Briefcase, Mail, MessageSquare, Loader2, Copy, Check, RefreshCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { applicationsApi } from "../api/applications";
import { matchApi, tailoringApi } from "../api/features";
import { resumeApi } from "../api/resume";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { ResumeSuggestionsPanel } from "../components/resume/ResumeSuggestionsPanel";
import { toast } from "../context/ToastContext";
import api from "../api/axios";

const STATUSES = [
  { id: "discovered", label: "Discovered" },
  { id: "saved", label: "Saved" },
  { id: "preparing", label: "Preparing" },
  { id: "ready_to_apply", label: "Ready to Apply" },
  { id: "applied", label: "Applied" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "screening", label: "Screening" },
  { id: "oa", label: "Online Assessment (OA)" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
  { id: "on_hold", label: "On Hold" },
  { id: "stale", label: "Stale" }
];

export function ApplicationDetailPage() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingApplied, setConfirmingApplied] = useState(false);

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [runningMatch, setRunningMatch] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceError, setIntelligenceError] = useState("");

  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [tailoringData, setTailoringData] = useState(null);
  const [loadingTailoring, setLoadingTailoring] = useState(false);

  // Cover letter state
  const [coverLetter, setCoverLetter] = useState("");
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [coverLetterTone, setCoverLetterTone] = useState("professional");
  const [coverLetterHighlight, setCoverLetterHighlight] = useState("");
  const [copiedCL, setCopiedCL] = useState(false);

  // Recruiter message state
  const [recruiterMsg, setRecruiterMsg] = useState("");
  const [loadingRecruiterMsg, setLoadingRecruiterMsg] = useState(false);
  const [recruiterMsgType, setRecruiterMsgType] = useState("application");
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [versionSavedSuccess, setVersionSavedSuccess] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [appData, resumeData] = await Promise.all([
        applicationsApi.getOne(id),
        resumeApi.getAll()
      ]);
      const app = appData.application;
      setApp(app);
      setResumes(resumeData.resumes);
      setNotes(app.notes || "");
      if (app.resumeVersionId) setSelectedResumeId(app.resumeVersionId);
      if (app.matchResultId) {
        setMatchResult(app.matchResultId);
      }
      try {
        const intelligenceData = await applicationsApi.getIntelligence(id);
        setIntelligence(intelligenceData.intelligence);
        setIntelligenceError("");
      } catch {
        setIntelligence(null);
        setIntelligenceError("Application intelligence is unavailable for this record.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    try {
      const data = await applicationsApi.update(id, {
        status: newStatus,
        changedBy: "user_manual_update",
        source: "user_manual_update"
      });
      setApp(data.application);
      toast.success("Application status updated!");
    } catch (err) {
      toast.error("Failed to update status.");
    }
  }

  async function handleConfirmApplied() {
    setConfirmingApplied(true);
    try {
      const data = await applicationsApi.update(id, {
        status: "applied",
        dateApplied: new Date().toISOString(),
        changedBy: "user_confirmation",
        source: "user_confirmation",
        evidence: "User explicitly confirmed submitting application on detail workspace",
        statusNote: "Confirmed application submission"
      });
      setApp(data.application);
      toast.success("Application confirmed as Applied!");
    } catch (err) {
      toast.error("Failed to confirm application status.");
    } finally {
      setConfirmingApplied(false);
    }
  }

  async function saveNotes() {
    setIsSavingNotes(true);
    try {
      await applicationsApi.update(id, { notes });
      toast.success("Notes saved!");
    } catch (err) {
      toast.error("Failed to save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleRunMatch() {
    if (!selectedResumeId) return toast.warning("Select a resume first.");
    setRunningMatch(true);
    try {
      await applicationsApi.update(id, { resumeVersionId: selectedResumeId });
      const data = await matchApi.runMatch(id, selectedResumeId);
      setMatchResult(data.matchResult);
      await loadData(); // refresh app state
    } catch (err) {
      toast.error(err.response?.data?.message || "Match failed.");
    } finally {
      setRunningMatch(false);
    }
  }

  async function fetchTailoring() {
    if (!selectedResumeId) return toast.warning("Select a resume first.");
    setLoadingTailoring(true);
    try {
      const result = await tailoringApi.getRecommendations(id, selectedResumeId);
      if (result.success) {
        setTailoringData(result.data?.tailoring?.recommendations || "No specific recommendations provided.");
      }
    } catch (err) {
      toast.error("Failed to fetch tailoring recommendations.");
    } finally {
      setLoadingTailoring(false);
    }
  }

  async function handleSaveTailoredVersion() {
    if (!selectedResumeId) return toast.warning("Select a resume first.");
    setIsSavingVersion(true);
    setVersionSavedSuccess("");
    try {
      const res = await api.post("/tailor/save-version", {
        resumeId: selectedResumeId,
        applicationId: id,
        acceptedChanges: Array.isArray(tailoringData) ? tailoringData : []
      });
      setVersionSavedSuccess(res.data?.message || "New tailored resume version saved!");
      toast.success("New tailored resume version saved!");
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save tailored version.");
    } finally {
      setIsSavingVersion(false);
    }
  }


  async function generateCoverLetter() {
    setLoadingCoverLetter(true);
    try {
      const res = await api.post(`/applications/${id}/cover-letter`, {
        tone: coverLetterTone,
        highlight: coverLetterHighlight
      });
      setCoverLetter(res.data?.data?.coverLetter || "");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cover letter generation failed.");
    } finally {
      setLoadingCoverLetter(false);
    }
  }

  async function generateRecruiterMessage() {
    setLoadingRecruiterMsg(true);
    try {
      const res = await api.post(`/applications/${id}/recruiter-message`, {
        type: recruiterMsgType
      });
      setRecruiterMsg(res.data?.data?.message || "");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Message generation failed.");
    } finally {
      setLoadingRecruiterMsg(false);
    }
  }

  function copyText(text, setCopied) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-text-secondary font-medium">
      <Spinner size="lg" className="mb-4" />
      Loading application details...
    </div>
  );

  if (!app) return (
    <div className="bg-danger-bg text-danger p-6 rounded-xl border border-danger/20 font-medium max-w-xl mx-auto text-center mt-12">
      Application not found.
      <Link to="/applications" className="block mt-4 text-primary hover:underline">Return to Applications</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <Link to="/applications" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm self-start transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-primary/10">
        <ArrowLeft size={16} /> Back to Board
      </Link>

      {/* HEADER CARD */}
      <Card className="shadow-md border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-text mb-1 tracking-tight">{app.role}</h1>
            <h2 className="text-xl font-bold text-text-secondary mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-border" />
              {app.company}
            </h2>
            <div className="flex flex-wrap gap-4 text-text-secondary font-medium text-sm">
              {app.location && (
                <span className="flex items-center gap-1.5 bg-bg-secondary px-3 py-1 rounded-md border border-border">
                  <MapPin size={16} className="text-primary" /> {app.location}
                </span>
              )}
              {app.jobUrl && (
                <a href={app.jobUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:text-primary-hover bg-info-bg px-3 py-1 rounded-md border border-blue-200 transition-colors">
                  <LinkIcon size={16} /> Job Link
                </a>
              )}
            </div>
          </div>
          <div className="w-full md:w-auto bg-surface p-4 rounded-xl border border-border shadow-sm">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Application Status</label>
            <select
              value={app.status}
              onChange={handleStatusChange}
              className="w-full md:w-48 bg-white border border-border rounded-lg px-4 py-2.5 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer shadow-sm capitalize"
            >
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* SMART STATUS CONFIRMATION BANNER */}
      {["saved", "discovered", "preparing", "ready_to_apply", "draft"].includes(app.status) && (
        <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-primary/30 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <CheckCircle size={20} />
              </div>
              <div>
                <strong className="block text-sm font-bold text-text">Did you submit your application for this job?</strong>
                <p className="text-xs text-text-secondary">Confirm when you've submitted so CareerPilot can record the submission date and track your progress.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={handleConfirmApplied} isLoading={confirmingApplied}>
                Yes, I Applied
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex overflow-x-auto border-b border-border mb-4 scrollbar-hide">
        {[
          { id: "overview", label: "Overview", icon: Target },
          { id: "resume", label: "Resume Suggestions", icon: Sparkles },
          { id: "match", label: "Match Engine", icon: CheckCircle },
          { id: "timeline", label: "Timeline", icon: History },
          { id: "notes", label: "Notes", icon: Edit3 },
          { id: "outreach", label: "Cover Letter & Outreach", icon: Mail }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${isActive ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text hover:border-border"}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            <Card className="shadow-sm border-border">
              <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
                <div className="bg-green-100 p-1.5 rounded-md text-green-700 border border-green-200">
                  <Target size={18} />
                </div>
                <CardTitle className="text-lg m-0">Job Requirements Extraction</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {app.extractedJd ? (
                  <div className="flex flex-col gap-5">
                    <div>
                      <strong className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Required Skills</strong>
                      <div className="flex flex-wrap gap-2">
                        {app.extractedJd.requiredSkills.map(s => (
                          <span key={s} className="bg-surface border border-border text-text font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm">{s}</span>
                        ))}
                      </div>
                    </div>
                    {app.extractedJd.tools?.length > 0 && (
                      <div>
                        <strong className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Tools & Technologies</strong>
                        <div className="flex flex-wrap gap-2">
                          {app.extractedJd.tools.map(s => (
                            <span key={s} className="bg-bg-secondary border border-border text-text-secondary font-bold px-3 py-1.5 rounded-lg text-sm">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bg-secondary text-text-secondary mb-3">
                      <TriangleAlert size={24} />
                    </div>
                    <p className="text-text-secondary font-medium">AI extraction pending or failed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Intelligent Assistant UI */}
            <Card className="shadow-md border-primary/20 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
              <CardHeader className="bg-info-bg border-b border-blue-200 py-4 px-6 flex flex-row items-center gap-3">
                <div className="bg-primary p-1.5 rounded-md text-white shadow-sm">
                  <Sparkles size={18} />
                </div>
                <CardTitle className="text-lg m-0 text-primary">Intelligent Application Assistant</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {intelligenceError && (
                  <div className="bg-danger-bg border border-danger/20 text-danger p-4 rounded-xl text-sm font-medium mb-4">
                    {intelligenceError}
                  </div>
                )}

                {intelligence ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6">

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm text-center">
                          <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Suitability</span>
                          <strong className="text-xl font-extrabold text-primary capitalize">{intelligence.suitability}</strong>
                        </div>
                        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm text-center">
                          <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Match</span>
                          <strong className="text-xl font-extrabold text-primary">
                            {intelligence.matchPercentage === null ? "Run match" : `${intelligence.matchPercentage}%`}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-text mb-2">Personalized Advice</h4>
                        <p className="text-sm text-text-secondary leading-relaxed bg-bg-secondary p-4 rounded-xl border border-border">
                          {intelligence.personalizedAdvice}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                          Missing Keywords
                          <span className="bg-danger-bg text-danger px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest border border-danger/20">Critical</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {intelligence.missingKeywords.slice(0, 8).map((keyword) => (
                            <span key={keyword} className="bg-danger-bg border border-danger/20 text-danger px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                              {keyword}
                            </span>
                          ))}
                          {intelligence.missingKeywords.length === 0 && (
                            <span className="text-sm text-text-secondary italic">No missing keywords detected.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div>
                        <h4 className="text-sm font-bold text-text mb-3">Relevant Projects from Resume</h4>
                        <div className="flex flex-col gap-3">
                          {intelligence.relevantProjects.map((project) => (
                            <div key={`${project.name}-${project.description}`} className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-colors">
                              <strong className="block text-sm font-bold text-text mb-1">{project.name}</strong>
                              <p className="text-xs text-text-secondary leading-relaxed mb-3 line-clamp-2">{project.description || "No description available."}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(project.technologies || []).map(t => (
                                  <span key={t} className="bg-bg-secondary border border-border px-2 py-0.5 rounded text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {intelligence.relevantProjects.length === 0 && (
                            <div className="bg-warning-bg border border-warning/20 p-4 rounded-xl">
                              <p className="text-sm font-medium text-warning">No resume project clearly matches this JD yet. Do not fabricate one; improve your resume only with real evidence.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-text mb-3">Resume Content Suggestions</h4>
                        <div className="flex flex-col gap-2">
                          {intelligence.resumeImprovementSuggestions.slice(0, 4).map((item) => (
                            <div key={item.skill} className="bg-bg-secondary border border-border rounded-lg p-3 text-sm">
                              <strong className="text-primary block mb-1">{item.skill}</strong>
                              <span className="text-text-secondary leading-relaxed">{item.suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  !intelligenceError && (
                    <div className="flex justify-center items-center py-8 text-text-secondary text-sm font-medium">
                      <Spinner size="md" className="mr-3" /> Loading application intelligence...
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* RESUME SUGGESTIONS TAB */}
        {activeTab === "resume" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-surface p-4 border border-border rounded-xl">
              <label className="text-xs font-bold text-text-secondary uppercase">Active Resume:</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-text"
              >
                <option value="">Select a resume...</option>
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} (v{r.version})
                  </option>
                ))}
              </select>
            </div>

            {selectedResumeId ? (
              <ResumeSuggestionsPanel 
                resume={{ _id: selectedResumeId }}
                jobId={app.jobId?._id || app.jobId}
                jobDescription={app.extractedJd?.rawText || app.extractedJd?.summary}
              />
            ) : (
              <div className="p-8 bg-surface border border-border rounded-2xl text-center text-xs text-text-secondary">
                Please select a resume above to generate AI suggestions for this application.
              </div>
            )}
          </div>
        )}


        {/* MATCH TAB */}
        {activeTab === "match" && (
          <Card className="shadow-sm border-border overflow-visible z-10 max-w-2xl">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-purple-100 p-1.5 rounded-md text-purple-600 border border-purple-200">
                <Target size={18} />
              </div>
              <CardTitle className="text-lg m-0">Match Engine</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-5">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Selected Resume</label>
                <select
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  value={selectedResumeId}
                  onChange={e => setSelectedResumeId(e.target.value)}
                >
                  <option value="">Select a resume to match...</option>
                  {resumes.map(r => <option key={r._id} value={r._id}>{r.name} (v{r.version})</option>)}
                </select>
              </div>

              {matchResult ? (
                <div className="flex flex-col items-center">
                  <div className="relative mb-6 mt-4">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-border" />
                      <circle
                        cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent"
                        strokeDasharray={2 * Math.PI * 70}
                        strokeDashoffset={2 * Math.PI * 70 * (1 - matchResult.overallScore / 100)}
                        className={matchResult.overallScore >= 75 ? "text-success" : matchResult.overallScore >= 50 ? "text-warning" : "text-danger"}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-extrabold ${matchResult.overallScore >= 75 ? "text-success" : matchResult.overallScore >= 50 ? "text-warning" : "text-danger"}`}>
                        {matchResult.overallScore}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full mt-6">
                    <Button variant="secondary" onClick={handleRunMatch} disabled={runningMatch || !selectedResumeId} className="w-full">
                      {runningMatch ? "Analyzing..." : "Re-run Match"}
                    </Button>
                    <Link to={`/match/${matchResult._id}`} className="w-full">
                      <Button className="w-full">View Full Explanation</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                    Compare your resume against the JD requirements using our semantic engine.
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleRunMatch}
                    disabled={runningMatch || !selectedResumeId}
                    isLoading={runningMatch}
                  >
                    {!runningMatch && "Run Match"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TIMELINE TAB */}
        {activeTab === "timeline" && (
          <Card className="shadow-sm border-border max-w-2xl">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-gray-100 p-1.5 rounded-md text-gray-600 border border-gray-200">
                <History size={18} />
              </div>
              <CardTitle className="text-lg m-0">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative pl-6 border-l-2 border-border ml-2 space-y-6">
                {app.statusHistory.map((sh, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-[3px] border-surface shadow-sm"></div>
                    <strong className="block text-sm font-bold text-text capitalize mb-0.5">{sh.status}</strong>
                    <span className="text-xs font-medium text-text-secondary">{new Date(sh.changedAt).toLocaleString()}</span>
                    {sh.note && <p className="mt-2 text-sm text-text bg-surface p-3 rounded-lg border border-border">{sh.note}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* NOTES TAB */}
        {activeTab === "notes" && (
          <Card className="shadow-sm border-border max-w-2xl">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-gray-100 p-1.5 rounded-md text-gray-600 border border-gray-200">
                <Edit3 size={18} />
              </div>
              <CardTitle className="text-lg m-0">Notes & Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add interview notes, recruiter contacts, or next steps here..."
                className="w-full p-4 border border-border rounded-xl min-h-[200px] text-sm text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow bg-surface resize-y"
              />
              <div className="flex justify-end mt-4">
                <Button onClick={saveNotes} isLoading={isSavingNotes}>
                  {!isSavingNotes && <Save size={16} className="mr-2" />} Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* COVER LETTER & OUTREACH TAB */}
        {activeTab === "outreach" && (
          <div className="flex flex-col gap-5">
            {/* Cover Letter Generator */}
            <Card className="shadow-sm border-border">
              <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
                <div className="bg-blue-100 p-1.5 rounded-md text-blue-600 border border-blue-200">
                  <Mail size={18} />
                </div>
                <CardTitle className="text-lg m-0">Cover Letter Generator</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Tone</label>
                      <select value={coverLetterTone} onChange={e => setCoverLetterTone(e.target.value)}
                        className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="professional">Professional</option>
                        <option value="enthusiastic">Enthusiastic</option>
                        <option value="concise">Concise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Highlight (optional)</label>
                      <input type="text" placeholder="e.g. my system design project" value={coverLetterHighlight}
                        onChange={e => setCoverLetterHighlight(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <Button onClick={generateCoverLetter} isLoading={loadingCoverLetter} className="w-full sm:w-auto">
                    {!loadingCoverLetter && <Sparkles size={16} className="mr-2" />} Generate Cover Letter
                  </Button>

                  {coverLetter && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-secondary">Generated Cover Letter</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => copyText(coverLetter, setCopiedCL)}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                            {copiedCL ? <Check size={12} /> : <Copy size={12} />} {copiedCL ? "Copied!" : "Copy"}
                          </button>
                          <button onClick={generateCoverLetter}
                            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
                            <RefreshCcw size={12} /> Regenerate
                          </button>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-border rounded-xl p-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                        {coverLetter}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recruiter Message Generator */}
            <Card className="shadow-sm border-border">
              <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
                <div className="bg-violet-100 p-1.5 rounded-md text-violet-600 border border-violet-200">
                  <MessageSquare size={18} />
                </div>
                <CardTitle className="text-lg m-0">Recruiter Message</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Message Type</label>
                    <div className="flex gap-2">
                      {[{value:"application",label:"Introduction"},{value:"followup",label:"Follow-up"},{value:"thankyou",label:"Thank You"}].map(t => (
                        <button key={t.value} onClick={() => setRecruiterMsgType(t.value)}
                          className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg border transition-all ${
                            recruiterMsgType === t.value
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-text-secondary border-border hover:border-primary/30"
                          }`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={generateRecruiterMessage} isLoading={loadingRecruiterMsg} className="w-full sm:w-auto">
                    {!loadingRecruiterMsg && <MessageSquare size={16} className="mr-2" />} Generate Message
                  </Button>

                  {recruiterMsg && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-secondary">Generated Message</span>
                        <button onClick={() => copyText(recruiterMsg, setCopiedRM)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                          {copiedRM ? <Check size={12} /> : <Copy size={12} />} {copiedRM ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="bg-slate-50 border border-border rounded-xl p-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {recruiterMsg}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
