import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resumeApi } from "../api/resume";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { AlertTriangle, Sparkles, Layout, Save, CheckCircle, Clock, GitCompare, ArrowUpDown, BarChart2, ExternalLink } from "lucide-react";
import ResumeEditor from "../components/resume/ResumeEditor";
import ResumePreview from "../components/resume/ResumePreview";
import ResumeIntelligence from "../components/resume/ResumeIntelligence";
import { KeywordIntelligence } from "../components/resume/KeywordIntelligence";
import { ProfileConfirmationModal } from "../components/resume/ProfileConfirmationModal";
import { OriginalResumeViewer } from "../components/resume/OriginalResumeViewer";
import { toast } from "../context/ToastContext";
import api from "../api/axios";
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function ResumeStudioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved, saving, error
  
  // Right panel views: "preview", "intelligence", or "diff"
  const [rightPanel, setRightPanel] = useState("preview");

  // Version Diff states
  const [versions, setVersions] = useState([]);
  const [compareVersionId, setCompareVersionId] = useState("");
  const [diffData, setDiffData] = useState(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOriginalModal, setShowOriginalModal] = useState(false);

  useEffect(() => {
    loadResume();
  }, [id]);

  const loadResume = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await resumeApi.getOne(id);
      setResume(data.resume);
      setStructuredData(data.resume.structuredData || {});
      
      // Load available versions for diff comparison
      const baseId = data.resume.parentVersionId || data.resume._id;
      const versionsData = await resumeApi.getVersions(baseId);
      if (versionsData?.versions) {
        // Filter out current version from comparison selection
        const otherVersions = versionsData.versions.filter(v => v._id !== id);
        setVersions(otherVersions);
        if (otherVersions.length > 0) {
          setCompareVersionId(otherVersions[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load resume workspace.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger diff comparison when selected version changes
  useEffect(() => {
    if (compareVersionId && rightPanel === "diff") {
      fetchDiff();
    }
  }, [compareVersionId, rightPanel]);

  const fetchDiff = async () => {
    try {
      setLoadingDiff(true);
      setDiffError("");
      const diff = await resumeApi.getDiff(compareVersionId, id);
      setDiffData(diff);
    } catch (err) {
      console.error(err);
      setDiffError("Failed to calculate version difference.");
    } finally {
      setLoadingDiff(false);
    }
  };

  // Debounced save draft
  const debouncedSaveDraft = useCallback(
    debounce(async (dataToSave) => {
      try {
        setSaveStatus("saving");
        await api.post(`/resumes/${id}/draft`, { structuredData: dataToSave });
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
      }
    }, 1000),
    [id]
  );

  const handleDataChange = (newData) => {
    setStructuredData(newData);
    setSaveStatus("saving");
    debouncedSaveDraft(newData);
  };

  const handleSaveVersion = async () => {
    try {
      setSaving(true);
      const res = await api.post(`/resumes/${id}/version`, {
        versionName: `${resume.name} (v${resume.version + 1})`,
        structuredData
      });
      // Navigate to the new version's studio
      navigate(`/resume/studio/${res.data.data._id}`);
    } catch (err) {
      setError("Failed to save version");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Spinner size="lg" /></div>;
  if (error) return <div className="p-10 text-danger">{error}</div>;
  if (!resume) return <div className="p-10">Resume not found</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in bg-bg">
      
      {/* LEFT PANEL: RESUME EDITOR (Scrollable) */}
      <div className="w-1/2 flex flex-col border-r border-border bg-bg-secondary">
        <div className="p-4 bg-surface border-b border-border flex justify-between items-center z-10 shadow-sm">
          <div>
            <h1 className="font-bold text-sm text-text truncate max-w-[280px] m-0">{resume.name}</h1>
            <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-1">
              {resume.isDraft ? (
                <span className="text-warning font-bold flex items-center gap-1"><Clock size={10}/> Draft</span>
              ) : (
                <span className="text-success font-bold flex items-center gap-1"><CheckCircle size={10}/> Saved</span>
              )}
              <span className="font-bold">• Version {resume.version}</span>
              <span className="flex items-center gap-1 font-semibold">
                {saveStatus === "saving" ? (
                  <Spinner size="xs" />
                ) : saveStatus === "error" ? (
                  <AlertTriangle size={10} className="text-danger" />
                ) : (
                  <CheckCircle size={10} className="text-success" />
                )}
                {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Save failed" : "All changes saved"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-bg-secondary text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Sync Profile
            </button>
            <button 
              onClick={() => setShowOriginalModal(true)} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ExternalLink size={13} /> View Original
            </button>
            <button 
              onClick={handleSaveVersion} 
              disabled={saving} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save size={13} /> Commit Version
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <ResumeEditor data={structuredData} onChange={handleDataChange} resumeId={id} />
        </div>
      </div>

      {/* RIGHT PANEL: INTERACTIVE SWITCHBOARD */}
      <div className="w-1/2 flex flex-col bg-bg">
        <div className="p-2 border-b border-border flex gap-1.5 bg-surface/80 backdrop-blur shadow-xs">
          <button 
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rightPanel === "preview" 
                ? "bg-primary text-white shadow-sm" 
                : "text-text-secondary hover:text-text hover:bg-bg-secondary"
            }`}
            onClick={() => setRightPanel("preview")}
          >
            <Layout size={14} /> Preview
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rightPanel === "intelligence" 
                ? "bg-primary text-white shadow-sm" 
                : "text-text-secondary hover:text-text hover:bg-bg-secondary"
            }`}
            onClick={() => setRightPanel("intelligence")}
          >
            <Sparkles size={14} /> Intelligence
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rightPanel === "ats" 
                ? "bg-primary text-white shadow-sm" 
                : "text-text-secondary hover:text-text hover:bg-bg-secondary"
            }`}
            onClick={() => setRightPanel("ats")}
          >
            <BarChart2 size={14} /> ATS & Keywords
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rightPanel === "diff" 
                ? "bg-primary text-white shadow-sm" 
                : "text-text-secondary hover:text-text hover:bg-bg-secondary"
            }`}
            onClick={() => setRightPanel("diff")}
          >
            <GitCompare size={14} /> Version Diff
          </button>
        </div>
        
        {/* Workspace Display Area */}
        <div className="flex-1 overflow-y-auto bg-[#525659] p-6 relative">
          
          {rightPanel === "preview" && (
            <ResumePreview data={structuredData} />
          )}

          {rightPanel === "intelligence" && (
            <ResumeIntelligence resumeId={id} structuredData={structuredData} />
          )}

          {rightPanel === "ats" && (
            <KeywordIntelligence
              resumeId={id}
              structuredData={structuredData}
              jobId={resume?.jobId || null}
            />
          )}

          {rightPanel === "diff" && (
            <div className="bg-surface rounded-xl border border-border p-6 shadow-lg max-w-2xl mx-auto flex flex-col gap-6 h-full overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-text m-0 flex items-center gap-1.5">
                    <GitCompare size={16} className="text-primary" /> Version Comparisons
                  </h3>
                  <p className="text-[10px] text-text-secondary m-0 mt-0.5 font-medium">Compare current edits with past commits.</p>
                </div>
                
                {versions.length > 0 ? (
                  <div className="flex items-center gap-2 bg-bg-secondary border border-border px-3 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Compare:</span>
                    <select 
                      className="bg-transparent border-0 outline-none text-xs font-bold text-text cursor-pointer"
                      value={compareVersionId}
                      onChange={(e) => setCompareVersionId(e.target.value)}
                    >
                      {versions.map(v => (
                        <option key={v._id} value={v._id}>Version {v.version} ({v.name || "Unnamed"})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-text-secondary">No other versions to compare.</span>
                )}
              </div>

              {loadingDiff ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <Spinner className="text-primary" />
                  <span className="text-[10px] font-semibold text-text-secondary">Generating diff analysis...</span>
                </div>
              ) : diffError ? (
                <div className="text-center p-6 text-danger text-xs font-medium bg-danger-bg rounded-lg border border-danger/10">
                  {diffError}
                </div>
              ) : diffData ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  
                  {/* Diff Summary Indicators */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-success/5 border border-success/15 p-2.5 rounded-lg flex flex-col items-center">
                      <span className="text-[10px] font-bold text-success uppercase leading-none">Words Added</span>
                      <strong className="text-lg font-black text-success mt-1">{diffData.diff?.summary?.added || 0}</strong>
                    </div>
                    <div className="bg-danger/5 border border-danger/15 p-2.5 rounded-lg flex flex-col items-center">
                      <span className="text-[10px] font-bold text-danger uppercase leading-none">Words Removed</span>
                      <strong className="text-lg font-black text-danger mt-1">{diffData.diff?.summary?.removed || 0}</strong>
                    </div>
                    <div className="bg-bg-secondary border border-border p-2.5 rounded-lg flex flex-col items-center">
                      <span className="text-[10px] font-bold text-text-secondary uppercase leading-none">Unchanged</span>
                      <strong className="text-lg font-black text-text mt-1">{diffData.diff?.summary?.unchanged || 0}</strong>
                    </div>
                  </div>

                  {/* Character Highlight Diff Block */}
                  <div className="flex-1 overflow-y-auto border border-border rounded-lg p-4 bg-bg-secondary/40 font-mono text-xs leading-relaxed max-h-[300px]">
                    {diffData.diff?.parts && diffData.diff.parts.length > 0 ? (
                      diffData.diff.parts.map((part, index) => {
                        if (part.added) {
                          return (
                            <ins 
                              key={index} 
                              className="bg-success/20 text-success-dark font-extrabold no-underline px-1 border-b border-success rounded"
                            >
                              {part.value}
                            </ins>
                          );
                        }
                        if (part.removed) {
                          return (
                            <del 
                              key={index} 
                              className="bg-danger/20 text-danger-dark line-through px-1 border-b border-danger rounded opacity-80"
                            >
                              {part.value}
                            </del>
                          );
                        }
                        return <span key={index} className="text-text-secondary">{part.value}</span>;
                      })
                    ) : (
                      <span className="text-text-secondary italic">Versions are identical.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-secondary italic text-xs">
                  Select a version above to view modifications.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showProfileModal && structuredData && (
        <ProfileConfirmationModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          structuredData={structuredData}
          onConfirmSuccess={() => {
            toast.success("Profile synced successfully!");
            setShowProfileModal(false);
          }}
        />
      )}

      {showOriginalModal && (
        <OriginalResumeViewer
          isOpen={showOriginalModal}
          onClose={() => setShowOriginalModal(false)}
          resume={resume}
        />
      )}
    </div>
  );
}
