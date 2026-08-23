import React, { useRef } from "react";
import { UploadCloud } from "lucide-react";

export default function ResumeUpload({ uploading, onUpload }) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    onUpload(e);

    // Allow selecting the same file again later.
    if (e.target) {
      e.target.value = "";
    }
  }

  return (
    <div
      className="upload-dropzone"
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: "2px dashed #cbd5e1",
        borderRadius: "10px",
        padding: "32px 24px",
        textAlign: "center",
        cursor: uploading ? "not-allowed" : "pointer",
        background: "#ffffff",
        transition: "all 0.2s ease",
        opacity: uploading ? 0.7 : 1,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = "#1463ff";
        e.currentTarget.style.background = "#f8faff";
      }}
      onDragLeave={(e) => {
        e.currentTarget.style.borderColor = "#cbd5e1";
        e.currentTarget.style.background = "#ffffff";
      }}
      onDrop={(e) => {
        e.preventDefault();

        e.currentTarget.style.borderColor = "#cbd5e1";
        e.currentTarget.style.background = "#ffffff";

        const file = e.dataTransfer.files?.[0];

        if (!file || uploading) return;

        // Reuse the same handler shape as a normal input event.
        const event = {
          target: {
            files: [file],
          },
        };

        onUpload(event);
      }}
    >
      <UploadCloud
        size={34}
        color="#1463ff"
        style={{
          margin: "0 auto 12px",
        }}
      />

      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "1rem",
          color: "#172033",
        }}
      >
        {uploading ? "Uploading & Analyzing..." : "Upload Resume"}
      </h3>

      <p
        style={{
          margin: "0 0 12px",
          fontSize: "0.85rem",
          color: "#5b6475",
        }}
      >
        {uploading
          ? "Please wait while we process your resume."
          : "Drag & drop your resume here or click to browse"}
      </p>

      <span
        style={{
          display: "inline-block",
          fontSize: "0.75rem",
          color: "#7a8497",
          background: "#f5f7fb",
          padding: "5px 9px",
          borderRadius: "5px",
        }}
      >
        PDF or TXT • Max 5MB
      </span>

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept=".pdf,.txt"
        disabled={uploading}
        onChange={handleFileChange}
      />
    </div>
  );
}
