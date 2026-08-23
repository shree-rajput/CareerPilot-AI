import React from "react";
import { Sparkles, Save, CheckCircle } from "lucide-react";

export default function JobDescriptionPanel({
  role,
  onChangeRole,
  company,
  onChangeCompany,
  jobDescription,
  onChangeJobDescription,
  onSaveJob,
  onAnalyze,
  savingJob,
  analyzing,
  isJobSaved,
  isResumeSelected,
  validationError,
}) {
  const canSave = role.trim() && company.trim() && jobDescription.trim().length >= 50;

  return (
    <section
      style={{
        padding: "24px",
        borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc",
        display: "grid",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "4px",
        }}
      >
        <Sparkles size={18} color="#1463ff" />
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            color: "#172033",
            fontWeight: 600,
          }}
        >
          Target Job Details
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#475569",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Job Title *
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => onChangeRole(e.target.value)}
            placeholder="e.g. Full Stack Software Engineer"
            disabled={savingJob || analyzing}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "0.85rem",
              outline: "none",
              background: "#ffffff",
              transition: "border-color 0.2s",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#475569",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Company *
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => onChangeCompany(e.target.value)}
            placeholder="e.g. Example Company"
            disabled={savingJob || analyzing}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "0.85rem",
              outline: "none",
              background: "#ffffff",
              transition: "border-color 0.2s",
            }}
          />
        </div>
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#475569",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Job Description *
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => onChangeJobDescription(e.target.value)}
          placeholder="Paste the complete job description here (minimum 50 characters)..."
          disabled={savingJob || analyzing}
          rows={5}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "0.85rem",
            lineHeight: 1.6,
            fontFamily: "inherit",
            outline: "none",
            background: "#ffffff",
          }}
        />
      </div>

      {validationError && (
        <div style={{ color: "#b4233c", fontSize: "0.8rem", fontWeight: 500 }}>
          {validationError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isJobSaved && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.82rem",
                color: "#137547",
                fontWeight: 600,
              }}
            >
              <CheckCircle size={16} /> Job saved ✓
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={onSaveJob}
            disabled={savingJob || analyzing || !canSave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "9px 14px",
              background: canSave ? "#ffffff" : "#f1f5f9",
              color: canSave ? "#334155" : "#94a3b8",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: canSave && !savingJob && !analyzing ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            <Save size={15} />
            {savingJob ? "Saving..." : "Save Job"}
          </button>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={!isResumeSelected || !isJobSaved || analyzing || savingJob}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: 0,
              borderRadius: "8px",
              padding: "10px 16px",
              background:
                !isResumeSelected || !isJobSaved || analyzing || savingJob
                  ? "#94a3b8"
                  : "#1463ff",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor:
                !isResumeSelected || !isJobSaved || analyzing || savingJob
                  ? "not-allowed"
                  : "pointer",
              transition: "background 0.2s",
            }}
          >
            <Sparkles size={15} />
            {analyzing ? "Analyzing..." : "Analyze Resume"}
          </button>
        </div>
      </div>
    </section>
  );
}
