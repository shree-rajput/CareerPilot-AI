import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, UploadCloud, History, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { resumeApi } from "../api/resume";
import { applicationsApi } from "../api/applications";
import { matchApi, tailoringApi } from "../api/features";
import JobDescriptionPanel from "../components/resume/JobDesciption";
import AnalysisDashboard from "../components/resume/AnalysisDashboard";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

export function ResumePage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Selection states
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [resumeDetail, setResumeDetail] = useState(null);
  const [resumeVersions, setResumeVersions] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    try {
      setLoading(true);
      setError("");
      const data = await resumeApi.getAll();
      setResumes(data.resumes || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load resumes from the server."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(resumeId) {
    try {
      setLoadingVersions(true);
      const data = await resumeApi.getVersions(resumeId);
      setResumeVersions(data.versions || []);
    } catch (err) {
      console.error("Failed to load resume versions:", err);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const fileExtension = file.name.split(".").pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !["pdf", "txt", "docx"].includes(fileExtension)) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Resume must be smaller than 10MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setNotice("");

      const formData = new FormData();
      formData.append("resume", file);
      formData.append("label", file.name.replace(/\.[^/.]+$/, ""));

      if (resumeDetail) {
        formData.append("parentVersionId", resumeDetail.parentVersionId || resumeDetail._id);
      }

      const result = await resumeApi.upload(formData);
      const warnings = result.status?.warnings || [];
      setNotice([result.message, ...warnings].filter(Boolean).join(" "));

      await loadResumes();
      const uploadedResume = result.resume;
      if (uploadedResume?._id) {
        await selectResume(uploadedResume._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Resume upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(id, event) {
    event.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to delete this resume?");
    if (!confirmed) return;

    try {
      setError("");
      setNotice("");
      await resumeApi.delete(id);

      if (selectedResumeId === id) {
        setSelectedResumeId(null);
        setResumeDetail(null);
        setResumeVersions([]);
        setAnalysisResult(null);
        setTailoringResult(null);
      }

      await loadResumes();
      setNotice("Resume deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete resume.");
    }
  }

  async function selectResume(id) {
    navigate(`/resume/studio/${id}`);
  }

  async function handleRestoreVersion(versionId) {
    try {
      setError("");
      setNotice("");
      setLoading(true);
      const result = await resumeApi.restore(versionId);
      setNotice(result.message);
      await loadResumes();
      if (result.resume?._id) {
        await selectResume(result.resume._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restore version.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* LEFT: SIDEBAR */}
      <aside className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
        
        {/* File Upload Zone */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all bg-surface hover:bg-bg-secondary ${
            uploading ? "cursor-wait border-primary/50 opacity-70" : "cursor-pointer border-border hover:border-primary/50"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="text-sm font-bold text-text mb-1">
            {uploading ? "Extracting Text..." : "Upload Resume"}
          </h3>
          <p className="text-xs text-text-secondary font-medium">
            PDF, DOCX, or TXT up to 10MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-danger-bg border border-danger/20 text-danger px-3 py-2 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-success-bg border border-success/20 text-success px-3 py-2 rounded-lg text-sm font-medium">
            {notice}
          </div>
        )}

        {/* Resume Selection Library */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-1">Active Resumes</h3>
          
          {loading ? (
            <div className="text-sm text-text-secondary py-2 flex items-center"><Spinner size="sm" className="mr-2"/> Loading...</div>
          ) : resumes.length === 0 ? (
            <div className="text-sm text-text-secondary italic py-2">No resumes found.</div>
          ) : null}

          {resumes.map((resume) => {
            const isSelected = selectedResumeId === resume._id || resumeVersions.some(v => v._id === selectedResumeId && v._id === resume._id);
            return (
              <div
                key={resume._id}
                onClick={() => selectResume(resume._id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected ? "bg-info-bg border-primary shadow-sm" : "bg-surface border-border hover:bg-bg-secondary"
                }`}
              >
                <FileText className={`h-5 w-5 ${isSelected ? "text-primary" : "text-text-secondary"}`} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-text truncate mb-0.5">{resume.name}</h4>
                  <span className="text-xs text-text-secondary font-medium">
                    v{resume.version} • {resume.fileType?.toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(resume._id, e)}
                  className="p-1 text-danger opacity-60 hover:opacity-100 hover:bg-danger-bg rounded transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Versions Selection */}
        {resumeDetail && resumeVersions.length > 1 && (
          <div className="flex flex-col gap-2 pt-4 border-t border-border mt-2">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Version History
            </h4>
            
            <div className="flex flex-col gap-1.5">
              {resumeVersions.map((v) => {
                const isActiveVer = selectedResumeId === v._id;
                return (
                  <div
                    key={v._id}
                    onClick={() => selectResume(v._id)}
                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                      isActiveVer ? "bg-bg-secondary border-border font-bold text-text" : "bg-transparent border-transparent text-text-secondary hover:bg-surface hover:border-border"
                    }`}
                  >
                    <span>
                      Version {v.version} {isActiveVer && "✓"}
                    </span>
                    {!isActiveVer && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreVersion(v._id);
                        }}
                        className="text-primary hover:text-primary-hover font-bold px-2 py-0.5 rounded hover:bg-info-bg transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

        {/* RIGHT: WORKSPACE */}
        <Card className="flex-1 w-full min-h-[600px] flex flex-col items-center justify-center p-10 text-center shadow-sm">
            <FileText className="h-16 w-16 text-primary/50 mb-6" />
            <h2 className="text-2xl font-bold text-text mb-3">Resume Intelligence Studio</h2>
            <p className="text-sm text-text-secondary max-w-md mb-8">
              Select a resume from the left or upload a new one to open the full-screen Resume Studio. You can edit, tailor, and analyze your resumes in real-time.
            </p>
        </Card>
    </div>
  );
}

