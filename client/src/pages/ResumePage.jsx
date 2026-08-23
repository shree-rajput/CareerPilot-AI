import React, { useEffect, useRef, useState } from "react";
import { FileText, Trash2, UploadCloud, History, AlertTriangle, ArrowLeft } from "lucide-react";
import { resumeApi } from "../api/resume";
import { applicationsApi } from "../api/applications";
import { matchApi, tailoringApi } from "../api/features";
import JobDescriptionPanel from "../components/resume/JobDesciption";
import AnalysisDashboard from "../components/resume/AnalysisDashboard";

export function ResumePage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Selection states
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [resumeDetail, setResumeDetail] = useState(null);
  const [resumeVersions, setResumeVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Job description states
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [savingJob, setSavingJob] = useState(false);
  const [isJobSaved, setIsJobSaved] = useState(false);
  const [savedJob, setSavedJob] = useState(null);
  const [validationError, setValidationError] = useState("");

  // Analysis states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [tailoringResult, setTailoringResult] = useState(null);
  const [isCachedResult, setIsCachedResult] = useState(false);

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

      // If a resume is currently selected, upload it as a new version
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
    try {
      setSelectedResumeId(id);
      setResumeDetail(null);
      setError("");
      setNotice("");
      setAnalysisResult(null);
      setTailoringResult(null);

      const data = await resumeApi.getOne(id);
      setResumeDetail(data.resume);
      
      // Load versions of the selected resume
      await loadVersions(id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load resume detail.");
    }
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

  async function handleSaveJob() {
    if (!role.trim() || !company.trim() || !jobDescription.trim()) {
      setValidationError("Job Title, Company, and Job Description are required.");
      return;
    }

    if (jobDescription.trim().length < 50) {
      setValidationError("Please paste the full job description (at least 50 characters).");
      return;
    }

    try {
      setSavingJob(true);
      setValidationError("");
      setError("");
      setNotice("");
      
      setAnalysisStatus("Extracting job requirements...");
      const result = await applicationsApi.create({
        role: role.trim(),
        company: company.trim(),
        jobDescription: jobDescription.trim(),
      });

      setSavedJob(result.application);
      setIsJobSaved(true);
      setNotice("Job saved and requirements extracted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save job details.");
      setIsJobSaved(false);
    } finally {
      setSavingJob(false);
      setAnalysisStatus("");
    }
  }

  async function handleAnalyze() {
    if (!selectedResumeId) {
      setError("Please select a resume version first.");
      return;
    }
    if (!isJobSaved || !savedJob?._id) {
      setError("Please save the job details before analyzing.");
      return;
    }

    try {
      setAnalyzing(true);
      setError("");
      setNotice("");
      setAnalysisResult(null);
      setTailoringResult(null);

      // Phase 1: Semantic Match Analysis
      setAnalysisStatus("Analyzing resume against job description...");
      const matchData = await matchApi.runMatch(savedJob._id, selectedResumeId);
      setAnalysisResult(matchData.matchResult);
      setIsCachedResult(Boolean(matchData.cached));

      // Phase 2: Tailoring Recommendations
      setAnalysisStatus("Generating tailoring recommendations...");
      try {
        const tailoringData = await tailoringApi.getRecommendations(savedJob._id, selectedResumeId);
        setTailoringResult(tailoringData.data || tailoringData);
      } catch (tailorErr) {
        console.error("Tailoring recommendations failed:", tailorErr);
        // Non-fatal, match score is still valid
      }

      setNotice("Match analysis and tailoring recommendations ready.");
    } catch (err) {
      console.error("Match analysis failed:", err);
      setError(err.response?.data?.message || "Resume match analysis failed.");
    } finally {
      setAnalyzing(false);
      setAnalysisStatus("");
    }
  }

  const handleJobFieldChange = (setter) => (val) => {
    setter(val);
    setIsJobSaved(false); // Reset saved status on any field change
    setSavedJob(null);
  };

  return (
    <section
      className="page-grid"
      style={{
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <div
        className="desktop-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "320px minmax(0, 1fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* =========================
            LEFT: SIDEBAR
        ========================== */}
        <aside style={{ display: "grid", gap: "20px" }}>
          {/* File Upload zone */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "24px 16px",
              textAlign: "center",
              cursor: uploading ? "wait" : "pointer",
              background: "#ffffff",
              transition: "all 0.2s ease",
            }}
          >
            <UploadCloud size={32} color="#1463ff" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 600 }}>
              {uploading ? "Extracting Text..." : "Upload Resume"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
              PDF, DOCX, or TXT up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </div>

          {/* Messages */}
          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#b4233c",
                fontSize: "0.8rem",
              }}
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#ecfdf3",
                border: "1px solid #bbf7d0",
                color: "#137547",
                fontSize: "0.8rem",
              }}
            >
              {notice}
            </div>
          )}

          {/* Resume Selection Library */}
          <div style={{ display: "grid", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#475569" }}>
              Active Resumes
            </h3>
            
            {loading ? (
              <div style={{ fontSize: "0.85rem", color: "#64748b", padding: "10px 0" }}>Loading...</div>
            ) : resumes.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "#64748b", padding: "10px 0" }}>No resumes found.</div>
            ) : null}

            {resumes.map((resume) => {
              const isSelected = selectedResumeId === resume._id || resumeVersions.some(v => v._id === selectedResumeId && v._id === resume._id);
              return (
                <div
                  key={resume._id}
                  onClick={() => selectResume(resume._id)}
                  style={{
                    padding: "12px",
                    background: isSelected ? "#eef4ff" : "#ffffff",
                    border: isSelected ? "1px solid #1463ff" : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <FileText size={18} color={isSelected ? "#1463ff" : "#64748b"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: "0 0 2px", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {resume.name}
                    </h4>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      v{resume.version} • {resume.fileType?.toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(resume._id, e)}
                    style={{ border: 0, background: "transparent", cursor: "pointer", padding: "4px", color: "#ef4444" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Versions Selection */}
          {resumeDetail && resumeVersions.length > 1 && (
            <div style={{ display: "grid", gap: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                <History size={15} /> Version History
              </h4>
              
              <div style={{ display: "grid", gap: "6px" }}>
                {resumeVersions.map((v) => {
                  const isActiveVer = selectedResumeId === v._id;
                  return (
                    <div
                      key={v._id}
                      onClick={() => selectResume(v._id)}
                      style={{
                        padding: "8px 10px",
                        background: isActiveVer ? "#f1f5f9" : "transparent",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: isActiveVer ? 600 : 400 }}>
                        Version {v.version} {isActiveVer && "✓"}
                      </span>
                      {!isActiveVer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreVersion(v._id);
                          }}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "#1463ff",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                          }}
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

        {/* =========================
            RIGHT: WORKSPACE
        ========================== */}
        <main
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            minHeight: "600px",
            overflow: "hidden",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          {!selectedResumeId ? (
            <div
              style={{
                minHeight: "600px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "40px",
              }}
            >
              <div>
                <FileText size={48} color="#94a3b8" style={{ margin: "0 auto 16px" }} />
                <h2 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "#1e293b" }}>
                  Select a resume to begin analysis.
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
                  Upload a new resume or select an existing version to input a job description.
                </p>
              </div>
            </div>
          ) : !resumeDetail ? (
            <div style={{ padding: "40px", color: "#64748b", fontSize: "0.9rem" }}>
              Loading structured resume details...
            </div>
          ) : (
            <div>
              {/* Job description input panel */}
              <JobDescriptionPanel
                role={role}
                onChangeRole={handleJobFieldChange(setRole)}
                company={company}
                onChangeCompany={handleJobFieldChange(setCompany)}
                jobDescription={jobDescription}
                onChangeJobDescription={handleJobFieldChange(setJobDescription)}
                onSaveJob={handleSaveJob}
                onAnalyze={handleAnalyze}
                savingJob={savingJob}
                analyzing={analyzing}
                isJobSaved={isJobSaved}
                isResumeSelected={Boolean(resumeDetail)}
                validationError={validationError}
              />

              {/* Progress and status overlays */}
              {(savingJob || analyzing) && (
                <div
                  style={{
                    padding: "24px",
                    background: "#eff6ff",
                    borderBottom: "1px solid #bfdbfe",
                    color: "#1e40af",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                  }}
                >
                  <div className="spinner" style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid #1e40af",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  <span>{analysisStatus || "Processing..."}</span>
                </div>
              )}

              {/* Match Dashboard */}
              {analysisResult && (
                <AnalysisDashboard
                  matchResult={analysisResult}
                  tailoringData={tailoringResult}
                  isCached={isCachedResult}
                />
              )}

              {/* Fallback to normal resume detail view if not analyzed yet */}
              {!analysisResult && !analyzing && (
                <div style={{ padding: "24px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", color: "#475569", fontSize: "0.85rem", marginBottom: "20px" }}>
                    <AlertTriangle size={16} color="#eab308" />
                    <span>
                      Resume selected ✓ Paste a job description to analyze compatibility above.
                    </span>
                  </div>
                  <ResumeDetail resume={resumeDetail} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Embedded CSS spinner style */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}

/* =======================================
   RESUME DETAIL SUITE (STAYS PRESERVED)
   ======================================= */
function ResumeDetail({ resume }) {
  const structured = resume.structuredData;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 700 }}>
            {resume.name}
          </h2>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
            Version {resume.version} • {resume.fileType?.toUpperCase()}
          </p>
          {resume.cloudinaryUrl && (
            <a
              href={resume.cloudinaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: "6px",
                color: "#1463ff",
                fontSize: "0.8rem",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              View Original File ↗
            </a>
          )}
        </div>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "6px",
            background: structured ? "#ecfdf3" : "#fff1f2",
            color: structured ? "#137547" : "#b4233c",
            fontSize: "0.7rem",
            fontWeight: 600,
          }}
        >
          {structured ? "AI Structured" : "Raw Text Only"}
        </span>
      </div>

      <div style={{ display: "grid", gap: "24px" }}>
        {!structured ? (
          <section>
            <h3 style={{ fontSize: "0.9rem", color: "#0f172a", marginBottom: "8px" }}>Parsed Text</h3>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                lineHeight: 1.6,
                color: "#334155",
              }}
            >
              {resume.rawText}
            </pre>
          </section>
        ) : (
          <>
            {structured.summary && (
              <section>
                <SectionTitle title="Summary" />
                <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem", lineHeight: 1.6 }}>{structured.summary}</p>
              </section>
            )}

            {(structured.name || structured.email || structured.phone || structured.location) && (
              <section>
                <SectionTitle title="Contact" />
                <div style={{ display: "grid", gap: "4px", fontSize: "0.85rem", color: "#334155" }}>
                  {structured.name && <div><strong>Name:</strong> {structured.name}</div>}
                  {structured.email && <div><strong>Email:</strong> {structured.email}</div>}
                  {structured.phone && <div><strong>Phone:</strong> {structured.phone}</div>}
                  {structured.location && <div><strong>Location:</strong> {structured.location}</div>}
                </div>
              </section>
            )}

            {structured.skills?.length > 0 && (
              <section>
                <SectionTitle title="Skills" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {structured.skills.map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "4px 8px",
                        background: "#f1f5f9",
                        borderRadius: "4px",
                        fontSize: "0.78rem",
                        color: "#334155",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {structured.experience?.length > 0 && (
              <section>
                <SectionTitle title="Experience" />
                <div style={{ display: "grid", gap: "16px" }}>
                  {structured.experience.map((e, idx) => (
                    <div key={idx} style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "12px" }}>
                      <h4 style={{ margin: "0 0 2px", fontSize: "0.88rem", fontWeight: 600 }}>
                        {e.role} @ {e.company}
                      </h4>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "6px" }}>
                        {e.startDate} — {e.endDate}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5, color: "#475569" }}>
                        {e.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {structured.projects?.length > 0 && (
              <section>
                <SectionTitle title="Projects" />
                <div style={{ display: "grid", gap: "12px" }}>
                  {structured.projects.map((p, idx) => (
                    <div key={idx} style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <h4 style={{ margin: "0 0 4px", fontSize: "0.88rem", fontWeight: 600 }}>{p.name || "Project"}</h4>
                      <p style={{ margin: "0 0 6px", fontSize: "0.82rem", lineHeight: 1.5, color: "#475569" }}>
                        {p.description}
                      </p>
                      {p.technologies?.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {p.technologies.join(" • ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {structured.education?.length > 0 && (
              <section>
                <SectionTitle title="Education" />
                <div style={{ display: "grid", gap: "8px" }}>
                  {structured.education.map((edu, idx) => (
                    <div key={idx} style={{ fontSize: "0.82rem" }}>
                      <strong style={{ color: "#0f172a" }}>{edu.degree || edu.institution}</strong>
                      <div style={{ color: "#64748b" }}>
                        {[edu.institution, edu.branch, edu.startYear || edu.endYear ? `${edu.startYear || ""} - ${edu.endYear || ""}` : "", edu.gpa ? `GPA: ${edu.gpa}` : ""].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <h3
      style={{
        margin: "0 0 10px",
        fontSize: "0.88rem",
        color: "#475569",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {title}
    </h3>
  );
}
