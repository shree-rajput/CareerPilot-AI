import React, { useState, useEffect } from "react";
import { X, Download, ExternalLink, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { resumeApi } from "../../api/resume";
import { Spinner } from "../ui/Spinner";

export function OriginalResumeViewer({ isOpen, onClose, resume }) {
  const [downloading, setDownloading] = useState(false);
  const [txtContent, setTxtContent] = useState(null);
  const [loadingTxt, setLoadingTxt] = useState(false);

  const fileType = (resume?.fileType || resume?.originalFilename?.split(".").pop() || "pdf").toLowerCase();
  const isPDF = fileType === "pdf";
  const isTXT = fileType === "txt";
  const isDOCX = fileType === "docx";

  const viewUrl = resume?._id ? resumeApi.viewUrl(resume._id) : null;

  useEffect(() => {
    if (isOpen && isTXT && resume?._id) {
      loadTxtContent();
    }
  }, [isOpen, resume?._id, isTXT]);

  async function loadTxtContent() {
    setLoadingTxt(true);
    try {
      const response = await fetch(viewUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const text = await response.text();
        setTxtContent(text);
      } else {
        setTxtContent(resume?.rawText || "Failed to load plain text content.");
      }
    } catch (err) {
      setTxtContent(resume?.rawText || "Failed to load plain text content.");
    } finally {
      setLoadingTxt(false);
    }
  }

  async function handleDownload() {
    if (!resume?._id) return;
    try {
      setDownloading(true);
      const filename = resume.originalFilename || `${resume.name || "Resume"}.${fileType}`;
      await resumeApi.downloadOriginal(resume._id, filename);
    } catch (err) {
      console.error("Failed to download original file:", err);
    } finally {
      setDownloading(false);
    }
  }

  if (!isOpen || !resume) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 md:p-8 animate-in fade-in">
      <div className="bg-bg-secondary w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-surface border-b border-border shadow-2xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary-bg p-2.5 rounded-xl text-primary border border-primary-border/30">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-text text-base m-0 leading-tight">Original Resume Document</h2>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-bg-secondary border border-border text-primary">
                  {fileType.toUpperCase()}
                </span>
                <span className="text-[10px] font-bold text-success bg-success-bg px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 size={10} /> Immutable Source
                </span>
              </div>
              <p className="text-text-secondary text-xs m-0 mt-0.5 font-medium">
                {resume.originalFilename || resume.name || "Resume Document"} · Version {resume.version || 1}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(viewUrl, "_blank")} 
              className="flex items-center gap-1.5"
            >
              <ExternalLink size={14} /> <span className="hidden sm:inline">Open in New Tab</span>
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleDownload} 
              isLoading={downloading}
              className="flex items-center gap-1.5"
            >
              <Download size={14} /> <span>Download Original</span>
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="ml-1 bg-surface hover:bg-danger-bg hover:text-danger rounded-lg w-9 h-9 p-0 flex items-center justify-center border border-border"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Viewer Content Area */}
        <div className="flex-1 bg-bg flex items-center justify-center overflow-hidden relative p-4">
          {isPDF ? (
            <iframe
              src={viewUrl}
              title="Original Resume PDF Viewer"
              className="w-full h-full border-0 bg-white rounded-xl shadow-inner"
            />
          ) : isTXT ? (
            <div className="w-full h-full bg-surface border border-border rounded-xl p-6 overflow-y-auto font-mono text-xs text-text leading-relaxed whitespace-pre-wrap custom-scrollbar">
              {loadingTxt ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
                  <Spinner size="md" className="text-primary" />
                  <span>Loading original text content...</span>
                </div>
              ) : (
                txtContent || resume.rawText || "No text available."
              )}
            </div>
          ) : isDOCX ? (
            <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center gap-4 shadow-lg">
              <div className="p-4 rounded-2xl bg-primary-bg text-primary border border-primary-border/30">
                <FileText size={44} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-text m-0">Microsoft Word Document (.docx)</h3>
                <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed font-medium">
                  Browser security prevents inline rendering of binary DOCX files. Download the original document to edit or view in Word / Google Docs.
                </p>
              </div>
              <Button 
                variant="primary" 
                size="md" 
                onClick={handleDownload} 
                isLoading={downloading}
                className="w-full mt-2"
              >
                <Download size={16} /> Download {resume.originalFilename || "Resume.docx"}
              </Button>
            </div>
          ) : (
            <iframe
              src={viewUrl}
              title="Original Resume Viewer"
              className="w-full h-full border-0 bg-white rounded-xl"
            />
          )}
        </div>

      </div>
    </div>
  );
}
