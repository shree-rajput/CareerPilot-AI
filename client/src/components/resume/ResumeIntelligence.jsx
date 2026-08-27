import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import api from "../../api/axios";
import { Target, Sparkles, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function ResumeIntelligence({ resumeId, structuredData }) {
  const [jobId, setJobId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

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
    <div className="bg-surface p-6 rounded-xl border border-border space-y-6 max-w-[800px] mx-auto text-text">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Target className="text-primary"/> Job Targeting</h2>
        <p className="text-sm text-text-secondary">Enter a Job ID to analyze your resume against it.</p>
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
        {error && <p className="text-danger text-sm">{error}</p>}
      </div>

      {analysis && (
        <div className="space-y-6 animate-in fade-in">
          {/* Score Overview */}
          <div className="grid grid-cols-3 gap-4">
            <ScoreCard title="ATS Compatibility" score={analysis.atsScore} />
            <ScoreCard title="Role Match" score={analysis.matchScore} />
            <ScoreCard title="Keyword Coverage" score={analysis.keywordCoverage} />
          </div>

          {/* Health Indicators */}
          <div className="bg-bg-secondary p-4 rounded-xl border border-border">
            <h3 className="font-bold mb-3 text-sm uppercase tracking-wider">Health Checks</h3>
            <div className="space-y-2">
              <HealthCheck label="Content Quality" score={analysis.healthIndicators.content} />
              <HealthCheck label="Clarity" score={analysis.healthIndicators.clarity} />
              <HealthCheck label="Completeness" score={analysis.healthIndicators.completeness} />
            </div>
          </div>

          {/* Missing Skills */}
          {analysis.missingSkills?.length > 0 && (
            <div className="bg-danger-bg p-4 rounded-xl border border-danger/20">
              <h3 className="font-bold text-danger mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={16}/> Missing Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysis.missingSkills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-surface border border-danger/30 rounded text-xs font-medium text-text">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {analysis.aiSuggestions?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-primary">
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
                      <p className="text-xs text-text bg-surface p-2 rounded border border-border line-through opacity-70">{sug.sourceText}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-success uppercase mb-1">Suggested</div>
                      <p className="text-xs text-text bg-success-bg p-2 rounded border border-success/30 font-medium">{sug.suggestedText}</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary mt-3 italic">Reason: {sug.reason}</p>
                </div>
              ))}
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
