import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, UploadCloud, History, ArrowRight, CheckCircle2 } from "lucide-react";
import { resumeApi } from "../api/resume";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";

export function ResumePage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

      const result = await resumeApi.upload(formData);
      const warnings = result.status?.warnings || [];
      setNotice([result.message, ...warnings].filter(Boolean).join(" "));

      await loadResumes();
      const uploadedResume = result.resume;
      if (uploadedResume?._id) {
        selectResume(uploadedResume._id);
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
      }

      await loadResumes();
      setNotice("Resume deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete resume.");
    }
  }

  function selectResume(id) {
    navigate(`/resume/studio/${id}`);
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start pb-12">
      
      {/* LEFT: RESUME LIBRARY SIDEBAR */}
      <aside className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        
        {/* Upload Box */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-5 text-center transition-all bg-surface hover:bg-bg-secondary ${
            uploading ? "cursor-wait border-primary/50 opacity-70" : "cursor-pointer border-border hover:border-primary-border"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-primary-bg text-primary flex items-center justify-center mx-auto mb-2.5">
            <UploadCloud className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-text mb-0.5">
            {uploading ? "Parsing Document..." : "Upload Resume File"}
          </h3>
          <p className="text-[11px] text-text-secondary font-medium m-0">
            PDF, DOCX, or TXT (Max 10MB)
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

        {/* Banners */}
        {error && (
          <div className="bg-danger-bg border border-danger-border/60 text-danger p-3 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-success-bg border border-success-border/60 text-success p-3 rounded-lg text-xs font-medium">
            {notice}
          </div>
        )}

        {/* Resumes List */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider m-0">Resume Library</h3>
            <span className="text-[10px] font-mono font-bold text-text-muted">{resumes.length} Document{resumes.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="text-xs text-text-secondary py-3 flex items-center justify-center gap-2">
              <Spinner size="xs" /> Loading resumes...
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-xs text-text-muted italic py-4 text-center">
              No resumes uploaded yet. Upload a PDF or DOCX file above to begin ATS intelligence parsing.
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.map((resume) => (
                <div
                  key={resume._id}
                  onClick={() => selectResume(resume._id)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-bg-secondary cursor-pointer transition-all group"
                >
                  <div className="p-2 rounded-md bg-bg-secondary text-text-secondary group-hover:text-primary group-hover:bg-primary-bg transition-colors">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-text truncate m-0 group-hover:text-primary transition-colors">{resume.name}</h4>
                    <span className="text-[10px] text-text-muted font-medium block mt-0.5">
                      v{resume.version} · {resume.fileType?.toUpperCase() || "DOC"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(resume._id, e)}
                    className="p-1 text-text-muted hover:text-danger hover:bg-danger-bg rounded transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </aside>

      {/* RIGHT: MAIN WORKSPACE LAUNCHER */}
      <Card className="flex-1 w-full min-h-[540px] flex flex-col items-center justify-center p-8 text-center bg-surface">
        <div className="w-12 h-12 rounded-xl bg-primary-bg text-primary flex items-center justify-center mb-4">
          <FileText className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-text m-0 tracking-tight">Resume Intelligence Workspace</h2>
        <p className="text-xs text-text-secondary max-w-md mt-2 leading-relaxed font-medium">
          Select an existing resume from your library or upload a document to analyze ATS readiness, compare target jobs, and receive actionable AI Resume Suggestions.
        </p>

        {resumes.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => selectResume(resumes[0]._id)}
            className="mt-6"
          >
            <span>Open Latest Resume Intelligence Workspace</span>
            <ArrowRight size={14} />
          </Button>
        )}
      </Card>
    </div>
  );
}
