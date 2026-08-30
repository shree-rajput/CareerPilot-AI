import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, XCircle, AlertCircle, TrendingUp, BarChart2,
  ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import api from "../../api/axios";

/**
 * KeywordIntelligence
 * 
 * Analyzes the resume's structured data and compares it against the job's
 * extracted skills. Shows presence/absence of each keyword in the resume.
 * Works without a job selected (shows all skills as untracked in that case).
 *
 * @param {{ resumeId: string, structuredData: object, jobId?: string }} props
 */
export function KeywordIntelligence({ resumeId, structuredData, jobId }) {
  const [jobData, setJobData] = useState(null);
  const [loadingJob, setLoadingJob] = useState(false);

  // Load job data if jobId provided
  useEffect(() => {
    if (!jobId) return;
    setLoadingJob(true);
    api.get(`/jobs/${jobId}`)
      .then(r => setJobData(r.data?.data || null))
      .catch(() => setJobData(null))
      .finally(() => setLoadingJob(false));
  }, [jobId]);

  // Extract all skills from structured resume
  const resumeSkillSet = useMemo(() => {
    if (!structuredData) return new Set();
    const skills = new Set();
    // From skills array
    if (Array.isArray(structuredData.skills)) {
      structuredData.skills.forEach(s => {
        if (typeof s === "string") skills.add(s.toLowerCase());
        else if (s.name) skills.add(s.name.toLowerCase());
        else if (s.keywords) s.keywords.forEach(k => skills.add(k.toLowerCase()));
      });
    }
    // From work experience highlights
    if (Array.isArray(structuredData.work)) {
      structuredData.work.forEach(w => {
        if (Array.isArray(w.highlights)) {
          w.highlights.forEach(h => {
            // simple heuristic: extract capitalized multi-word phrases
            const words = String(h).match(/\b[A-Z][A-Za-z+#.]+(?:\s+[A-Z][A-Za-z+#.]+)*/g) || [];
            words.forEach(word => skills.add(word.toLowerCase()));
          });
        }
        if (Array.isArray(w.technologies)) {
          w.technologies.forEach(t => skills.add(String(t).toLowerCase()));
        }
      });
    }
    return skills;
  }, [structuredData]);

  // Score: does a keyword appear somewhere in the resume?
  function getStatus(skillName) {
    const lower = skillName.toLowerCase();
    if (resumeSkillSet.has(lower)) return "PRESENT";
    // Partial match — skill name is substring of any skill
    for (const s of resumeSkillSet) {
      if (s.includes(lower) || lower.includes(s)) return "PARTIAL";
    }
    // Also search raw text in structured data
    const rawStr = JSON.stringify(structuredData || "").toLowerCase();
    if (rawStr.includes(lower)) return "PARTIAL";
    return "MISSING";
  }

  // ATS score calculation based on stored structuredData
  const atsScore = useMemo(() => {
    if (!structuredData) return 0;
    let score = 50;
    if (structuredData.basics?.email) score += 5;
    if (structuredData.basics?.phone) score += 5;
    if (structuredData.basics?.summary?.length > 50) score += 10;
    if (structuredData.work?.length > 0) score += 15;
    if (structuredData.education?.length > 0) score += 5;
    if (structuredData.skills?.length > 0) score += 10;
    return Math.min(score, 100);
  }, [structuredData]);

  // Categories to render
  const categories = jobData ? [
    { label: "Required", skills: jobData.requiredSkills || [], color: "rose" },
    { label: "Preferred", skills: jobData.preferredSkills || [], color: "amber" },
    { label: "Soft Skills", skills: jobData.softSkills || [], color: "violet" }
  ] : [];

  const totalRequired = jobData?.requiredSkills?.length || 0;
  const presentRequired = jobData?.requiredSkills?.filter(s => getStatus(s.skillName) !== "MISSING").length || 0;

  const atsColor = atsScore >= 80 ? "text-emerald-600" : atsScore >= 60 ? "text-amber-600" : "text-rose-500";
  const atsBarColor = atsScore >= 80 ? "bg-emerald-500" : atsScore >= 60 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm flex flex-col gap-5 max-w-2xl mx-auto">
      {/* ATS Score Section */}
      <div>
        <h3 className="text-sm font-extrabold text-text flex items-center gap-1.5 mb-3">
          <BarChart2 size={15} className="text-primary" /> ATS Compatibility Score
        </h3>

        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="#e2e8f0" strokeWidth="7" />
              <circle cx="30" cy="30" r="24" fill="none"
                stroke={atsScore >= 80 ? "#10b981" : atsScore >= 60 ? "#f59e0b" : "#ef4444"}
                strokeWidth="7"
                strokeDasharray={`${(atsScore / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-black ${atsColor}`}>{atsScore}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            {[
              { label: "Contact Info", ok: !!(structuredData?.basics?.email && structuredData?.basics?.phone), points: 10 },
              { label: "Professional Summary", ok: structuredData?.basics?.summary?.length > 50, points: 10 },
              { label: "Work Experience", ok: structuredData?.work?.length > 0, points: 15 },
              { label: "Education Section", ok: structuredData?.education?.length > 0, points: 5 },
              { label: "Skills Section", ok: structuredData?.skills?.length > 0, points: 10 }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                {item.ok
                  ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  : <XCircle size={12} className="text-rose-400 shrink-0" />}
                <span className="text-[11px] font-medium text-text-secondary">{item.label}</span>
                <span className={`text-[10px] font-bold ml-auto ${item.ok ? "text-emerald-600" : "text-slate-400"}`}>
                  {item.ok ? `+${item.points}` : "+0"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Job Keyword Analysis */}
      {loadingJob && (
        <div className="flex items-center gap-2 text-text-secondary text-xs">
          <Loader2 size={13} className="animate-spin" /> Loading job keywords...
        </div>
      )}

      {!jobId && !loadingJob && (
        <div className="text-center py-6 bg-bg-secondary rounded-xl border border-dashed border-border">
          <TrendingUp size={22} className="text-text-secondary mx-auto mb-2" />
          <p className="text-xs font-semibold text-text-secondary">No job selected</p>
          <p className="text-[10px] text-text-secondary/70 mt-1">Use "Analyze Against Job" to see keyword match intelligence</p>
        </div>
      )}

      {jobData && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-text">Keyword Intelligence</h3>
            {totalRequired > 0 && (
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${presentRequired === totalRequired ? "bg-emerald-50 text-emerald-700 border-emerald-200" : presentRequired >= totalRequired * 0.7 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                {presentRequired}/{totalRequired} required
              </span>
            )}
          </div>

          {categories.map(cat => cat.skills.length > 0 && (
            <KeywordCategory
              key={cat.label}
              label={cat.label}
              skills={cat.skills}
              getStatus={getStatus}
              color={cat.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KeywordCategory({ label, skills, getStatus, color }) {
  const [expanded, setExpanded] = useState(true);
  const statusCounts = {
    PRESENT: skills.filter(s => getStatus(s.skillName) === "PRESENT").length,
    PARTIAL: skills.filter(s => getStatus(s.skillName) === "PARTIAL").length,
    MISSING: skills.filter(s => getStatus(s.skillName) === "MISSING").length
  };

  const colorMap = {
    rose: { badge: "bg-rose-50 text-rose-700 border-rose-200", header: "text-rose-700" },
    amber: { badge: "bg-amber-50 text-amber-700 border-amber-200", header: "text-amber-700" },
    violet: { badge: "bg-violet-50 text-violet-700 border-violet-200", header: "text-violet-700" }
  };
  const c = colorMap[color] || colorMap.rose;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-bg-secondary hover:bg-bg-secondary/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-wide ${c.header}`}>{label}</span>
          <span className="text-[10px] text-text-secondary font-medium">{skills.length} skills</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-600">{statusCounts.PRESENT} ✓</span>
          <span className="text-[10px] font-bold text-amber-600">{statusCounts.PARTIAL} ~</span>
          <span className="text-[10px] font-bold text-rose-500">{statusCounts.MISSING} ✗</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 flex flex-wrap gap-1.5 bg-surface">
          {skills.map(s => {
            const status = getStatus(s.skillName);
            return (
              <span key={s.skillName}
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${status === "PRESENT" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status === "PARTIAL" ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-600 border-rose-200"
                  }`}>
                {status === "PRESENT" ? <CheckCircle2 size={9} /> : status === "PARTIAL" ? <AlertCircle size={9} /> : <XCircle size={9} />}
                {s.skillName}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
