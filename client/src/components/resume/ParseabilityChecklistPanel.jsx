import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, FileText, Download } from "lucide-react";
import { resumeApi } from "../../api/resume";
import { Spinner } from "../ui/Spinner";

export function ParseabilityChecklistPanel({ resumeId, report: initialReport, templateId, onTemplateChange }) {
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);

  const templates = [
    { id: "classic", label: "Classic ATS", desc: "Single column, clean horizontal dividers, universal compatibility" },
    { id: "modern", label: "Modern Executive", desc: "Clean sans-serif typography with accent primary bar" },
    { id: "minimal", label: "Minimalist", desc: "Ultra-clean layout with generous line spacing" },
    { id: "executive", label: "Executive Leadership", desc: "Bold header block with serif typography" },
  ];

  const handleRunCheck = async () => {
    try {
      setLoading(true);
      const res = await resumeApi.runParseabilityCheck(resumeId);
      if (res?.parseabilityReport) {
        setReport(res.parseabilityReport);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checklistItems = [
    {
      key: "textExtractable",
      label: "Text Extractability",
      description: "PDF contains readable text layers rather than flat raster images",
      pass: report?.textExtractable,
    },
    {
      key: "readingOrderMatches",
      label: "Linear Reading Order",
      description: "Text stream maintains left-to-right top-to-bottom parser sequence",
      pass: report?.readingOrderMatches,
    },
    {
      key: "contactInfoDetected",
      label: "Contact Detail Extraction",
      description: "Parser successfully isolates email, phone number, and location",
      pass: report?.contactInfoDetected,
    },
    {
      key: "hasProblematicStructure",
      label: "Clean Single-Column Structure",
      description: "Free of nested tables, multi-column blocks, or embedded icons",
      pass: report ? !report.hasProblematicStructure : true,
    },
  ];

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-lg max-w-2xl mx-auto flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h3 className="text-sm font-black text-text uppercase tracking-wider m-0 flex items-center gap-2">
            <FileText size={16} className="text-primary" /> ATS Parseability Verification
          </h3>
          <p className="text-xs text-text-secondary m-0 mt-1 font-medium">
            Structural pass/fail verification checklist based on round-trip text extraction.
          </p>
        </div>
        <button
          onClick={handleRunCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-secondary hover:bg-surface text-text text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? <Spinner size="xs" /> : <RefreshCw size={13} />} Re-verify
        </button>
      </div>

      {/* TEMPLATE SWITCHER */}
      <div className="bg-bg-secondary p-4 rounded-xl border border-border">
        <label className="block text-xs font-bold text-text mb-2 uppercase tracking-wider">
          Decoupled Layout Template
        </label>
        <div className="grid grid-cols-2 gap-2">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onTemplateChange(tpl.id)}
              className={`p-3 rounded-lg text-left transition-all border cursor-pointer ${
                templateId === tpl.id
                  ? "bg-surface border-primary ring-1 ring-primary shadow-xs"
                  : "bg-surface/50 border-border hover:border-text-secondary"
              }`}
            >
              <div className="font-bold text-xs text-text">{tpl.label}</div>
              <div className="text-[10px] text-text-secondary mt-0.5">{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CHECKLIST */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text uppercase tracking-wider m-0">
          Structural Checklist Facts
        </h4>
        <div className="space-y-2">
          {checklistItems.map((item) => (
            <div
              key={item.key}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                item.pass
                  ? "bg-success/5 border-success/20 text-text"
                  : "bg-danger/5 border-danger/20 text-text"
              }`}
            >
              {item.pass ? (
                <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
              ) : (
                <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-text">{item.label}</span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      item.pass ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                    }`}
                  >
                    {item.pass ? "PASS" : "FAIL"}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary m-0 mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {report?.missingText && report.missingText.length > 0 && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-2 text-xs text-warning">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Extraction Gaps Detected:</span> {report.missingText.join(", ")}
            </div>
          </div>
        )}
      </div>

      {/* EXPORT OPTIONS */}
      <div className="border-t border-border pt-4 flex gap-3">
        <button
          onClick={() => resumeApi.downloadPdf(resumeId)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-hover transition-all text-center cursor-pointer border-0"
        >
          <Download size={14} /> Export PDF
        </button>
        <button
          onClick={() => resumeApi.downloadDocx(resumeId)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface border border-border text-text text-xs font-bold shadow-xs hover:bg-bg-secondary transition-all text-center cursor-pointer"
        >
          <Download size={14} /> Export DOCX
        </button>
      </div>
    </div>
  );
}
