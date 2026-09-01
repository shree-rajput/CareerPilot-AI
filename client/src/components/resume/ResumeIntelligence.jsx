import React, { useState, useMemo } from "react";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import api from "../../api/axios";
import { Target, Sparkles, CheckCircle2, AlertTriangle, XCircle, FileSearch, Repeat, SpellCheck, ArrowRight } from "lucide-react";

// List of action verbs to check for excessive repetition
const ACTION_VERBS = [
  "developed", "built", "created", "managed", "worked", "implemented", 
  "designed", "led", "handled", "assisted", "responsible", "maintained", "helped"
];

// Synonyms dictionary for action verbs
const SYNONYMS = {
  developed: ["engineered", "architected", "constructed", "formulated"],
  built: ["engineered", "constructed", "assembled", "established"],
  created: ["pioneered", "authored", "instigated", "designed"],
  managed: ["orchestrated", "supervised", "directed", "steered"],
  worked: ["collaborated", "executed", "contributed", "engaged"],
  implemented: ["deployed", "integrated", "executed", "enacted"],
  designed: ["architected", "conceptualized", "crafted", "modeled"],
  led: ["spearheaded", "guided", "championed", "piloted"],
  handled: ["directed", "streamlined", "resolved", "administered"],
  assisted: ["supported", "facilitated", "aided", "collaborated with"],
  responsible: ["spearheaded", "oversaw", "directed", "executed"],
  maintained: ["sustained", "optimized", "enhanced", "upgraded"],
  helped: ["facilitated", "enabled", "accelerated", "boosted"]
};

// Weak passive phrases audit
const WEAK_PHRASES = [
  { pattern: /responsible for/gi, issue: "Passive wording: 'responsible for'", suggestion: "Replace with 'Spearheaded', 'Oversaw', or 'Executed'" },
  { pattern: /worked on/gi, issue: "Weak verb: 'worked on'", suggestion: "Replace with 'Engineered', 'Architected', or 'Built'" },
  { pattern: /helped with|helped to/gi, issue: "Passive wording: 'helped with/to'", suggestion: "Replace with 'Facilitated', 'Collaborated on', or 'Accelerated'" },
  { pattern: /assisted in|assisted with/gi, issue: "Weak verb: 'assisted in'", suggestion: "Replace with 'Contributed to' or 'Supported'" },
  { pattern: /handled/gi, issue: "Generic verb: 'handled'", suggestion: "Replace with 'Streamlined', 'Directed', or 'Administered'" }
];

export default function ResumeIntelligence({ resumeId, structuredData }) {
  const [jobId, setJobId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("audit"); // 'audit' | 'job_target'

  // Deterministic Word Repetition & Grammar Audit
  const auditResults = useMemo(() => {
    if (!structuredData) return { wordCounts: [], weakPhraseMatches: [] };

    // Combine all descriptions
    const textBlocks = [
      structuredData.summary || "",
      ...(structuredData.experience || []).map(e => `${e.role || ""} ${e.company || ""} ${e.description || ""}`),
      ...(structuredData.projects || []).map(p => `${p.name || ""} ${p.description || ""} ${p.problemSolved || ""}`)
    ].join(" ").toLowerCase();

    // 1. Count verb frequencies
    const wordCounts = [];
    ACTION_VERBS.forEach(verb => {
      const regex = new RegExp(`\\b${verb}\\b`, "gi");
      const matches = textBlocks.match(regex);
      const count = matches ? matches.length : 0;
      if (count >= 2) {
        wordCounts.push({
          word: verb,
          count,
          synonyms: SYNONYMS[verb] || ["engineered", "spearheaded", "executed"]
        });
      }
    });

    // 2. Scan weak phrases
    const weakPhraseMatches = [];
    WEAK_PHRASES.forEach(({ pattern, issue, suggestion }) => {
      const matches = textBlocks.match(pattern);
      if (matches && matches.length > 0) {
        weakPhraseMatches.push({
          count: matches.length,
          issue,
          suggestion
        });
      }
    });

    return {
      wordCounts: wordCounts.sort((a, b) => b.count - a.count),
      weakPhraseMatches
    };
  }, [structuredData]);

  const handleAnalyze = async () => {
    if (!jobId) {
      setError("Please provide a Job ID");
      return;
    }
    try {
      setAnalyzing(true);
      setError("");
      const res = await api.post(`/resumes/${resumeId}/analyze-job`, { jobId });
      setAnalysis(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-xl border border-border space-y-6 max-w-[800px] mx-auto text-text shadow-sm">
      
      {/* Tab Controls */}
      <div className="flex gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "audit"
              ? "bg-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text hover:bg-bg-secondary"
          }`}
        >
          <SpellCheck size={14} /> Proofreading & Repetition Audit
        </button>
        <button
          onClick={() => setActiveTab("job_target")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "job_target"
              ? "bg-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text hover:bg-bg-secondary"
          }`}
        >
          <Target size={14} /> Job Target Matching
        </button>
      </div>

      {/* TAB 1: PROOFREADING & REPETITION AUDIT */}
      {activeTab === "audit" && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Header */}
          <div>
            <h3 className="font-bold text-sm text-text flex items-center gap-2 m-0">
              <FileSearch size={18} className="text-primary" /> Automated Resume Proofreader
            </h3>
            <p className="text-xs text-text-secondary mt-1 m-0">
              Scans your resume text for overused action verbs, passive phrasing, and grammatical improvement opportunities.
            </p>
          </div>

          {/* Overused Words / Repetition Warnings */}
          <div className="bg-bg-secondary border border-border p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5 m-0">
              <Repeat size={14} className="text-warning" /> Word Repetition Audit
            </h4>
            
            {auditResults.wordCounts.length === 0 ? (
              <p className="text-xs text-success font-medium m-0 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Excellent verb variety! No overused action verbs detected.
              </p>
            ) : (
              <div className="space-y-2">
                {auditResults.wordCounts.map((item, idx) => (
                  <div key={idx} className="bg-surface p-3 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-warning uppercase">"{item.word}"</span>
                      <span className="text-xs text-text-secondary font-medium ml-2">(Repeated {item.count} times)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text">Try:</span>
                      {item.synonyms.map((syn, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-bg-secondary border border-border rounded text-[10px] font-bold text-primary">
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Passive Wording & Phrasing Opportunities */}
          <div className="bg-bg-secondary border border-border p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5 m-0">
              <AlertTriangle size={14} className="text-danger" /> Passive Wording & Grammar Opportunities
            </h4>

            {auditResults.weakPhraseMatches.length === 0 ? (
              <p className="text-xs text-success font-medium m-0 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Strong action-oriented phrasing detected across all bullet points!
              </p>
            ) : (
              <div className="space-y-2">
                {auditResults.weakPhraseMatches.map((item, idx) => (
                  <div key={idx} className="bg-surface p-3 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-danger">{item.issue}</span>
                      <span className="text-[10px] text-text-secondary block mt-0.5">Found {item.count} occurrence(s)</span>
                    </div>
                    <div className="text-xs font-semibold text-success flex items-center gap-1">
                      <ArrowRight size={12} /> {item.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: JOB TARGET MATCHING */}
      {activeTab === "job_target" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-text flex items-center gap-2 m-0"><Target className="text-primary"/> Target Job Match</h3>
            <p className="text-xs text-text-secondary m-0">Paste a target Job ID to analyze resume fit, keyword coverage, and ATS health.</p>
            <div className="flex gap-2 mt-2">
              <input 
                type="text" 
                placeholder="Paste Job ID here..." 
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <Button variant="primary" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <Spinner size="sm" /> : "Analyze"}
              </Button>
            </div>
            {error && <p className="text-danger text-sm m-0">{error}</p>}
          </div>

          {analysis && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-3 gap-4">
                <ScoreCard title="ATS Compatibility" score={analysis.atsScore} />
                <ScoreCard title="Role Match" score={analysis.matchScore} />
                <ScoreCard title="Keyword Coverage" score={analysis.keywordCoverage} />
              </div>

              <div className="bg-bg-secondary p-4 rounded-xl border border-border">
                <h3 className="font-bold mb-3 text-sm uppercase tracking-wider m-0">Health Checks</h3>
                <div className="space-y-2 mt-2">
                  <HealthCheck label="Content Quality" score={analysis.healthIndicators.content} />
                  <HealthCheck label="Clarity" score={analysis.healthIndicators.clarity} />
                  <HealthCheck label="Completeness" score={analysis.healthIndicators.completeness} />
                </div>
              </div>

              {analysis.missingSkills?.length > 0 && (
                <div className="bg-danger-bg p-4 rounded-xl border border-danger/20">
                  <h3 className="font-bold text-danger mb-2 text-sm uppercase tracking-wider flex items-center gap-2 m-0">
                    <AlertTriangle size={16}/> Missing Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analysis.missingSkills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-surface border border-danger/30 rounded text-xs font-medium text-text">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.aiSuggestions?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-primary m-0">
                    <Sparkles size={16}/> AI Improvements
                  </h3>
                  {analysis.aiSuggestions.map((sug, i) => (
                    <div key={i} className="bg-bg-secondary border border-border p-4 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-surface rounded border border-border uppercase tracking-wider">{sug.section}</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                          sug.risk === 'low' ? 'bg-success-bg text-success' : sug.risk === 'medium' ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger'
                        }`}>
                          {sug.risk} risk
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <div className="text-[10px] font-bold text-text-secondary uppercase mb-1">Current</div>
                          <p className="text-xs text-text bg-surface p-2 rounded border border-border line-through opacity-70 m-0">{sug.sourceText}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-success uppercase mb-1">Suggested</div>
                          <p className="text-xs text-text bg-success-bg p-2 rounded border border-success/30 font-medium m-0">{sug.suggestedText}</p>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary mt-3 italic m-0">Reason: {sug.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function ScoreCard({ title, score }) {
  const getColor = (s) => {
    if (s >= 80) return "text-success border-success/30 bg-success-bg";
    if (s >= 50) return "text-warning border-warning/30 bg-warning-bg";
    return "text-danger border-danger/30 bg-danger-bg";
  };
  
  return (
    <div className={`p-4 rounded-xl border text-center ${getColor(score)}`}>
      <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{title}</div>
      <div className="text-3xl font-black">{score}%</div>
    </div>
  );
}

function HealthCheck({ label, score }) {
  const isGood = score >= 70;
  const Icon = isGood ? CheckCircle2 : XCircle;
  const color = isGood ? "text-success" : "text-danger";

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-32 h-2 bg-surface rounded-full overflow-hidden border border-border">
          <div className={`h-full ${isGood ? 'bg-success' : 'bg-warning'}`} style={{ width: `${score}%`}}></div>
        </div>
        <Icon size={16} className={color} />
      </div>
    </div>
  );
}
