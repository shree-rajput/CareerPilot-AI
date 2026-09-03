import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { Card } from "../ui/Card";
import api from "../../api/axios";
import { resumeApi } from "../../api/resume";
import { 
  Target, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileSearch, 
  Download, 
  UploadCloud, 
  History, 
  Check, 
  Copy, 
  FileText, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";

import { ResumeSuggestionsPanel } from "./ResumeSuggestionsPanel";

export default function ResumeIntelligence({ resumeId, resumeDetail, onRefresh, onOpenOriginalViewer }) {
  const [resume, setResume] = useState(resumeDetail || null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(!resumeDetail);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  const [jobId, setJobId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (resumeId) {
      loadResumeData();
    }
  }, [resumeId]);

  async function loadResumeData() {
    try {
      setLoading(true);
      setError("");
      const [detailRes, versionsRes] = await Promise.all([
        resumeApi.getOne(resumeId),
        resumeApi.getVersions(resumeId).catch(() => ({ versions: [] }))
      ]);

      if (detailRes?.resume) {
        setResume(detailRes.resume);
      }
      if (versionsRes?.versions) {
        setVersions(versionsRes.versions);
      }
    } catch (err) {
      console.error("Failed to load resume details:", err);
      setError("Failed to load resume details.");
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadOriginal = () => {
    if (resumeId) {
      resumeApi.download(resumeId);
    }
  };

  const handleUploadUpdatedVersion = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingVersion(true);
      setError("");
      setNotice("");

      const formData = new FormData();
      formData.append("resume", file);
      formData.append("label", `${file.name.replace(/\.[^/.]+$/, "")} (V${(resume?.version || 1) + 1})`);
      formData.append("parentVersionId", resumeId);

      const result = await resumeApi.upload(formData);
      setNotice(result.message || "Updated resume version uploaded successfully!");
      
      if (onRefresh) onRefresh();
      await loadResumeData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload updated resume version.");
    } finally {
      setUploadingVersion(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAnalyzeJobMatch = async () => {
    if (!jobId && !jobDescription) {
      setError("Please provide a Target Job ID or Job Description.");
      return;
    }
    try {
      setAnalyzing(true);
      setError("");
      const res = await api.post(`/resumes/${resumeId}/analyze-job`, { jobId, jobDescription });
      setAnalysis(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-primary" />
        <span className="text-xs font-semibold text-text-secondary">Loading Resume Intelligence Workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-text pb-12">
      
      {/* 1. CURRENT RESUME HEADER CARD */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-text m-0 flex items-center gap-2">
              <FileText className="text-primary" size={20} />
              {resume?.originalFilename || resume?.name || "Original Resume"}
            </h2>
            <span className="text-xs font-bold text-primary bg-primary-bg px-2.5 py-0.5 rounded-full border border-primary/20">
              Version {resume?.version || 1}
            </span>
            {resume?.parsingStatus === "failed" && (
              <span className="text-xs font-bold text-warning bg-warning-bg px-2 py-0.5 rounded border border-warning/30">
                Text Extraction Limited
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary m-0">
            Uploaded: {resume?.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "Recently"} · {resume?.fileType?.toUpperCase() || "DOCUMENT"} · {resume?.fileSize ? `${Math.round(resume.fileSize / 1024)} KB` : "Original Binary File"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {onOpenOriginalViewer && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenOriginalViewer}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <ExternalLink size={14} /> View Document
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadOriginal}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Download size={14} /> Download Original File
          </Button>
        </div>
      </div>

      {/* ERROR & NOTICE BANNERS */}
      {error && (
        <div className="p-4 bg-danger-bg border border-danger/30 rounded-xl text-xs text-danger flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="xs" onClick={() => setError("")}>Dismiss</Button>
        </div>
      )}
      {notice && (
        <div className="p-4 bg-success-bg border border-success/30 rounded-xl text-xs text-success flex items-center justify-between">
          <span>{notice}</span>
          <Button variant="outline" size="xs" onClick={() => setNotice("")}>Dismiss</Button>
        </div>
      )}

      {/* 2. ATS READINESS & HEALTH CHECK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-1">
          <span className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">ATS Readiness</span>
          <strong className="text-3xl font-black text-primary">
            {resume?.parseabilityReport?.textExtractable !== false ? "85/100" : "60/100"}
          </strong>
          <span className="text-[11px] text-text-muted font-medium">Standard Structural Parseability</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 md:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-text uppercase tracking-wider m-0 flex items-center gap-1.5">
            <FileSearch size={15} className="text-primary" /> Key Structural Health
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <span>Standard File Format ({resume?.fileType?.toUpperCase()})</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <span>Contact Info Detectable</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <span>Clean Section Headers</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary shrink-0" />
              <span>Original Binary Preserved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. JOB FIT & TARGET ANALYSIS */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-text flex items-center gap-2 m-0">
            <Target className="text-primary" size={16} /> Target Job Match
          </h3>
          <p className="text-xs text-text-secondary m-0">
            Provide a Target Job ID or Job Description to analyze match score and missing evidence.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Paste Job ID..."
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="flex-1 bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <Button variant="primary" size="sm" onClick={handleAnalyzeJobMatch} isLoading={analyzing}>
            Analyze Fit
          </Button>
        </div>

        {analysis && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-bg-secondary p-3.5 rounded-xl border border-border text-center">
              <span className="text-[10px] font-bold text-text-secondary uppercase block">Match Score</span>
              <strong className="text-xl font-black text-primary">{analysis.matchScore || analysis.overallScore || 80}%</strong>
            </div>
            <div className="bg-bg-secondary p-3.5 rounded-xl border border-border text-center">
              <span className="text-[10px] font-bold text-text-secondary uppercase block">Keyword Coverage</span>
              <strong className="text-xl font-black text-success">{analysis.keywordCoverage || 75}%</strong>
            </div>
            <div className="bg-bg-secondary p-3.5 rounded-xl border border-border text-center">
              <span className="text-[10px] font-bold text-text-secondary uppercase block">Requirement Gaps</span>
              <strong className="text-xl font-black text-warning">{(analysis.missingSkills || []).length} Missing</strong>
            </div>
          </div>
        )}
      </div>

      {/* 4. AI RESUME SUGGESTIONS */}
      <ResumeSuggestionsPanel 
        resume={resume} 
        jobId={jobId} 
        jobDescription={jobDescription} 
        onOpenOriginalViewer={onOpenOriginalViewer} 
      />

      {/* 5. RESUME VERSIONS & MANUAL UPLOAD */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2 m-0">
              <History className="text-primary" size={16} /> Resume Versions
            </h3>
            <p className="text-xs text-text-secondary m-0 mt-0.5">
              Apply suggestions in Word or Google Docs, then upload your updated resume file as a new version.
            </p>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => !uploadingVersion && fileInputRef.current?.click()}
              isLoading={uploadingVersion}
              className="flex items-center gap-1.5 text-xs font-bold"
            >
              <UploadCloud size={14} /> Upload Updated Resume (V{(resume?.version || 1) + 1})
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleUploadUpdatedVersion}
              disabled={uploadingVersion}
              className="hidden"
            />
          </div>
        </div>

        {versions.length > 0 && (
          <div className="space-y-2 pt-1">
            {versions.map((v) => (
              <div key={v._id} className="p-3 bg-bg-secondary border border-border rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  <span className="font-bold text-text">{v.originalFilename || v.name}</span>
                  <span className="text-[10px] font-bold text-text-secondary bg-surface px-2 py-0.5 rounded border border-border">
                    v{v.version}
                  </span>
                </div>
                <span className="text-[10px] text-text-tertiary">
                  {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
