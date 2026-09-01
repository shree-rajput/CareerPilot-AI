import React from "react";
import { X, ZoomIn, ZoomOut, Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "../ui/Button";

export function OriginalResumeViewer({ isOpen, onClose, resume }) {
  if (!isOpen || !resume) return null;

  // Assuming resumeApi.viewUrl or downloadUrl gives us the cloudinary original.
  // Actually, we can use resume.cloudinaryUrl if it exists.
  const url = resume.cloudinaryUrl;

  const isPDF = url && url.toLowerCase().endsWith(".pdf");
  
  // For DOCX or non-PDFs, browsers often download instead of displaying in iframe.
  // We can use Google Docs Viewer for non-pdf documents as a trick, or office web viewer.
  // URL: https://view.officeapps.live.com/op/embed.aspx?src={url}
  
  const getEmbedUrl = () => {
    if (!url) return null;
    if (isPDF) return url;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 animate-in fade-in">
      <div className="bg-bg-secondary w-full max-w-6xl h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-surface border-b border-border shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-text text-lg m-0 leading-tight">Original Resume</h2>
              <p className="text-text-secondary text-xs m-0">{resume.originalFileName || resume.name || "Document"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")} className="flex items-center gap-1.5">
              <ExternalLink size={16} /> <span className="hidden sm:inline">Open Externally</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const a = document.createElement("a");
              a.href = url;
              a.download = resume.originalFileName || "resume";
              a.click();
            }} className="flex items-center gap-1.5">
              <Download size={16} /> <span className="hidden sm:inline">Download</span>
            </Button>
            <Button variant="ghost" onClick={onClose} className="ml-2 bg-bg hover:bg-danger/10 hover:text-danger rounded-full w-10 h-10 p-0 flex items-center justify-center">
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 bg-bg flex items-center justify-center overflow-hidden relative">
          {!url ? (
            <div className="text-center p-8">
              <FileText size={48} className="mx-auto text-border mb-4" />
              <h3 className="text-text font-bold text-lg">No Source File Available</h3>
              <p className="text-text-secondary text-sm">This resume was created manually or the source file was not saved.</p>
            </div>
          ) : (
            <iframe
              src={getEmbedUrl()}
              title="Resume Viewer"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          )}
        </div>
      </div>
    </div>
  );
}
