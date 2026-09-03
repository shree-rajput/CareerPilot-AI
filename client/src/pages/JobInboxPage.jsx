import React, { useState, useEffect } from "react";
import {
  Inbox,
  Upload,
  Chrome,
  FileText,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { jobsApi } from "../api/jobs";
import PdfUploadModal from "../components/jobs/PdfUploadModal";

export function JobInboxPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobsApi.getInbox();
      setItems(res.data || []);
    } catch (err) {
      console.error("Fetch inbox error:", err);
      setError("Failed to load Job Inbox opportunities.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource =
      selectedSource === "all" || item.sourceType === selectedSource;

    return matchesSearch && matchesSource;
  });

  const getSourceBadge = (sourceType) => {
    switch (sourceType) {
      case "extension":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
            <Chrome size={12} /> Extension
          </span>
        );
      case "pdf":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            <FileText size={12} /> JD PDF
          </span>
        );
      case "url":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
            <ExternalLink size={12} /> Web URL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-bold">
            Manual
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Inbox size={20} />
            </div>
            <h1 className="text-xl font-black text-text tracking-tight">Job Inbox</h1>
          </div>
          <p className="text-xs text-text-muted">
            Captured opportunities from Chrome Extension & JD PDF Upload with automated match intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setPdfModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-primary/20"
          >
            <Upload size={15} /> Upload JD PDF
          </button>
          <button
            onClick={() => navigate("/applications")}
            className="px-4 py-2.5 rounded-xl bg-bg-secondary hover:bg-surface text-text-secondary hover:text-text text-xs font-bold transition-all flex items-center gap-2 border border-border"
          >
            View Tracker
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-3 text-text-muted" />
          <input
            type="text"
            placeholder="Search by role or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter size={12} /> Source:
          </span>
          {["all", "extension", "pdf", "url", "manual"].map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                selectedSource === src
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-surface text-text-secondary hover:text-text border border-border"
              }`}
            >
              {src === "all" ? "All Sources" : src === "extension" ? "Extension" : src === "pdf" ? "PDF" : src}
            </button>
          ))}
        </div>
      </div>

      {/* Main Opportunities Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="text-xs text-text-muted font-medium">Loading Job Inbox opportunities...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface p-12 rounded-2xl border border-border text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Inbox size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text">No opportunities captured yet</h3>
            <p className="text-xs text-text-muted">
              Use the CareerPilot Chrome Extension or Upload a JD PDF to automatically capture jobs without manual typing.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setPdfModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-primary-hover transition-all"
            >
              <Upload size={14} /> Upload JD PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.applicationId}
              className="bg-surface p-5 rounded-2xl border border-border hover:border-border-hover transition-all flex flex-col justify-between space-y-4 shadow-2xs group"
            >
              <div className="space-y-3">
                {/* Header line: Source badge & match pill */}
                <div className="flex items-center justify-between gap-2">
                  {getSourceBadge(item.sourceType)}
                  {item.matchScore > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold border border-primary/20">
                      <Sparkles size={11} /> {item.matchScore}% match
                    </span>
                  )}
                </div>

                {/* Role & Company */}
                <div>
                  <h3 className="text-base font-bold text-text group-hover:text-primary transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <div className="text-xs font-semibold text-text-muted mt-0.5">
                    {item.company} {item.location ? `• ${item.location}` : ""}
                  </div>
                </div>

                {/* Recommended Resume */}
                {item.recommendedResume && (
                  <div className="p-2.5 rounded-xl bg-bg-secondary border border-border text-xs flex items-center justify-between">
                    <span className="text-[11px] text-text-muted font-medium">Recommended Resume:</span>
                    <span className="font-bold text-text text-[11px]">{item.recommendedResume.name}</span>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/applications/${item.applicationId}`)}
                  className="px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-primary hover:text-white text-text-secondary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Analyze Fit <ArrowRight size={13} />
                </button>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-bg-secondary"
                    title="View Original Job Page"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Upload Modal */}
      <PdfUploadModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onSuccess={() => fetchInbox()}
      />
    </div>
  );
}
