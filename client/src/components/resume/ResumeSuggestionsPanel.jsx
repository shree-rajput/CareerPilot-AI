import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Bot, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  Layers, 
  Tag, 
  FolderGit2, 
  Briefcase,
  Download,
  Info
} from "lucide-react";
import { Button } from "../ui/Button";
import { useNavigate } from "react-router-dom";
import { resumeApi } from "../../api/resume";
import { Spinner } from "../ui/Spinner";

export function ResumeSuggestionsPanel({ resume, jobId, jobDescription, onOpenOriginalViewer }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (resume?._id) {
      loadSuggestions();
    }
  }, [resume?._id, jobId, jobDescription]);

  async function loadSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const data = await resumeApi.getSuggestions(resume._id, { jobId, jobDescription });
      setSuggestionsData(data);
    } catch (err) {
      console.error("Failed to load resume suggestions:", err);
      setError("Failed to generate suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(id, text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }

  function handleAskCopilot(sug) {
    const prompt = `Help me refine this resume suggestion for my target role (${suggestionsData?.jobTitle || "Target Role"}):\n\nOriginal Text: "${sug.originalText || "N/A"}"\nSuggestion: "${sug.suggestedText}"\nReason: "${sug.reason}"`;
    navigate("/copilot", { state: { prefilledPrompt: prompt, sourceContext: "Resume Suggestions" } });
  }

  const suggestions = suggestionsData?.suggestions || [];

  const filteredSuggestions = activeCategory === "ALL" 
    ? suggestions 
    : suggestions.filter(s => s.category === activeCategory);

  const categories = [
    { key: "ALL", label: "All Suggestions", count: suggestions.length },
    { key: "HIGH_IMPACT", label: "High Impact", count: suggestions.filter(s => s.category === "HIGH_IMPACT").length },
    { key: "RESUME_WORDING", label: "Wording (Before/After)", count: suggestions.filter(s => s.category === "RESUME_WORDING").length },
    { key: "KEYWORD_OPPORTUNITIES", label: "Keywords", count: suggestions.filter(s => s.category === "KEYWORD_OPPORTUNITIES").length },
    { key: "MISSING_EVIDENCE", label: "Requirement Gaps", count: suggestions.filter(s => s.category === "MISSING_EVIDENCE").length },
    { key: "PROJECT_EMPHASIS", label: "Projects", count: suggestions.filter(s => s.category === "PROJECT_EMPHASIS").length },
  ].filter(c => c.key === "ALL" || c.count > 0);

  return (
    <div className="space-y-6">
      
      {/* Banner / Value Proposition Header */}
      <div className="bg-gradient-to-r from-primary-bg via-surface to-bg border border-primary-border/40 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1.5 rounded-lg border border-primary/20">
                <Sparkles size={18} />
              </span>
              <h2 className="text-lg font-extrabold text-text tracking-tight m-0">
                AI Resume Intelligence & Suggestions
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success-bg px-2.5 py-0.5 rounded-full border border-success/30 flex items-center gap-1">
                <ShieldCheck size={12} /> Original Untouched
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed m-0">
              CareerPilot analyzes your stored original resume against job requirements to produce actionable suggestions. 
              Review, copy, and apply changes in <strong>Microsoft Word</strong> or <strong>Google Docs</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            {onOpenOriginalViewer && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenOriginalViewer}
                className="flex items-center gap-1.5 text-xs font-semibold w-full md:w-auto justify-center"
              >
                <FileText size={14} /> View Original Resume
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadSuggestions} 
              isLoading={loading}
              className="text-xs font-semibold"
            >
              Refresh Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                activeCategory === cat.key
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-surface text-text-secondary border-border hover:bg-bg-secondary hover:text-text"
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === cat.key ? "bg-white/20 text-white" : "bg-bg text-text-tertiary"
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center bg-surface border border-border rounded-2xl flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" className="text-primary" />
          <div>
            <h3 className="font-bold text-sm text-text">Analyzing Candidate Evidence vs Job Requirements</h3>
            <p className="text-xs text-text-secondary mt-1">Cross-referencing resume bullets, projects, and verified skills...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-danger-bg border border-danger/30 rounded-xl text-xs text-danger flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="xs" onClick={loadSuggestions}>Retry</Button>
        </div>
      )}

      {/* Empty Suggestions */}
      {!loading && !error && filteredSuggestions.length === 0 && (
        <div className="py-12 text-center bg-surface border border-border rounded-2xl p-6">
          <Check size={36} className="mx-auto text-success mb-2" />
          <h3 className="font-bold text-base text-text">Your Resume is Highly Aligned!</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
            No specific suggestions in this category. Your resume already covers the required technical competencies well.
          </p>
        </div>
      )}

      {/* Suggestions List */}
      {!loading && !error && filteredSuggestions.length > 0 && (
        <div className="space-y-4">
          {filteredSuggestions.map((sug) => {
            const isCopied = copiedId === sug.id;

            return (
              <div 
                key={sug.id} 
                className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-5 shadow-2xs transition-all space-y-3.5 group"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Badge */}
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                      sug.category === "HIGH_IMPACT" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
                      sug.category === "RESUME_WORDING" ? "bg-blue-500/10 text-blue-600 border-blue-500/30" :
                      sug.category === "KEYWORD_OPPORTUNITIES" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
                      sug.category === "MISSING_EVIDENCE" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" :
                      "bg-primary/10 text-primary border-primary/30"
                    }`}>
                      {sug.category.replace(/_/g, " ")}
                    </span>

                    {/* Evidence Source Badge */}
                    <span className="text-[10px] font-medium text-text-secondary bg-bg-secondary px-2 py-0.5 rounded border border-border">
                      {sug.evidenceSource}
                    </span>

                    <span className="text-xs text-text-tertiary font-mono">
                      {sug.section}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="xs" 
                      onClick={() => handleCopy(sug.id, sug.suggestedText)}
                      className={`flex items-center gap-1 font-semibold text-xs transition-colors ${
                        isCopied ? "bg-success-bg text-success border-success/40" : ""
                      }`}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{isCopied ? "✓ Copied" : "Copy"}</span>
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="xs" 
                      onClick={() => handleAskCopilot(sug)}
                      className="flex items-center gap-1 font-semibold text-xs text-primary hover:bg-primary-bg"
                    >
                      <Bot size={13} />
                      <span className="hidden sm:inline">Ask Copilot</span>
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <h4 className="font-bold text-text text-sm m-0">
                  {sug.title}
                </h4>

                {/* Before / After Comparison Box for Wording */}
                {sug.originalText && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="bg-bg-secondary border border-border/80 rounded-xl p-3 text-xs">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">
                        Current Resume Text:
                      </span>
                      <p className="text-text-secondary font-mono leading-relaxed m-0 italic">
                        "{sug.originalText}"
                      </p>
                    </div>

                    <div className="bg-primary-bg/50 border border-primary-border/50 rounded-xl p-3 text-xs">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
                        Suggested Phrasing:
                      </span>
                      <p className="text-text font-medium leading-relaxed m-0">
                        "{sug.suggestedText}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Single Suggestion Text (for Non-Wording categories) */}
                {!sug.originalText && (
                  <div className="bg-primary-bg/30 border border-primary-border/30 rounded-xl p-3.5 text-xs text-text font-medium leading-relaxed">
                    {sug.suggestedText}
                  </div>
                )}

                {/* Reasoning Footer */}
                {sug.reason && (
                  <div className="flex items-start gap-2 text-xs text-text-secondary pt-0.5">
                    <Info size={14} className="text-primary shrink-0 mt-0.5" />
                    <p className="m-0 leading-normal">{sug.reason}</p>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
