import React, { useState } from "react";
import { Upload, FileText, X, AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { jobsApi } from "../../api/jobs";

export default function PdfUploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lowConfidenceData, setLowConfidenceData] = useState(null);

  // Review & Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editText, setEditText] = useState("");

  if (!isOpen) return null;

  const handleFileDrop = (e) => {
    e.preventDefault();
    setError(null);
    const dropped = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!dropped) return;

    if (dropped.type !== "application/pdf" && !dropped.name.endsWith(".pdf")) {
      setError("Please select a valid PDF document.");
      return;
    }

    if (dropped.size > 10 * 1024 * 1024) {
      setError("File size exceeds maximum limit of 10MB.");
      return;
    }

    setFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await jobsApi.uploadJdPdf(formData);

      if (res.status === "low_confidence") {
        setLowConfidenceData(res);
        setEditTitle("Uploaded Position");
        setEditCompany("Company");
        setEditText(res.extractedText || "");
        setLoading(false);
        return;
      }

      if (res.status === "success") {
        setLoading(false);
        onSuccess(res.data);
        handleClose();
      }
    } catch (err) {
      console.error("PDF upload error:", err);
      setError(err.response?.data?.message || err.message || "Failed to process PDF job description.");
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await jobsApi.ingest({
        sourceType: "pdf",
        title: editTitle,
        company: editCompany,
        extractedText: editText,
        extractionConfidence: lowConfidenceData?.qualityScore || 50,
      });

      setLoading(false);
      onSuccess(res.data);
      handleClose();
    } catch (err) {
      console.error("Confirm ingestion error:", err);
      setError(err.response?.data?.message || "Failed to save edited job description.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setLoading(false);
    setError(null);
    setLowConfidenceData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-secondary/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Upload Job Description PDF</h2>
              <p className="text-[11px] text-text-muted">Extract & structure JD automatically via AI Intelligence</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-bg-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-bg/50 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {lowConfidenceData ? (
            /* Low Confidence Review Fallback Editor */
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs flex items-start gap-2.5">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">We couldn't confidently read this PDF ({lowConfidenceData.qualityScore}% score).</span>
                  <p className="mt-0.5 opacity-90 text-[11px]">Please review and edit the job title, company, and extracted text below before saving.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Company</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Extracted Text</label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[140px] bg-bg-secondary border border-border rounded-lg p-3 text-xs text-text outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setLowConfidenceData(null)} className="px-4 py-2 rounded-lg text-xs font-semibold text-text-muted hover:text-text">
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirm & Save Job
                </button>
              </div>
            </div>
          ) : (
            /* Upload Drag & Drop Area */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-border hover:border-primary/50 bg-bg-secondary/40 rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileDrop}
                  className="hidden"
                  id="pdfFileInput"
                />
                <label htmlFor="pdfFileInput" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-text block">Click to upload or drag and drop</span>
                    <span className="text-[11px] text-text-muted block">Text or scanned PDF job description (Max 10MB)</span>
                  </div>
                </label>

                {file && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-primary font-semibold">
                    <FileText size={14} />
                    <span>{file.name} ({Math.round(file.size / 1024)} KB)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-text-muted hover:text-text">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing PDF...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Upload & Ingest Job
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
