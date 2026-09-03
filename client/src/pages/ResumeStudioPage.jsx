import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resumeApi } from "../api/resume";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import ResumeIntelligence from "../components/resume/ResumeIntelligence";
import { OriginalResumeViewer } from "../components/resume/OriginalResumeViewer";

export function ResumeStudioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOriginalModal, setShowOriginalModal] = useState(false);

  useEffect(() => {
    loadResume();
  }, [id]);

  const loadResume = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await resumeApi.getOne(id);
      setResume(data.resume);
    } catch (err) {
      console.error(err);
      setError("Failed to load resume workspace.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-primary" />
        <span className="text-xs font-semibold text-text-secondary">Opening Resume Intelligence Workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <div className="p-4 bg-danger-bg text-danger border border-danger/30 rounded-xl text-xs font-medium">
          {error}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/resume")}>
          <ArrowLeft size={14} /> Return to Resume Library
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-6 animate-in fade-in">
      
      {/* HEADER BAR */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate("/resume")}
          className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} /> Back to Resumes
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOriginalModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-bg-secondary text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ExternalLink size={13} /> Original File
          </button>
          <button
            onClick={() => resumeApi.download(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Download size={13} /> Download Original File
          </button>
        </div>
      </div>

      {/* MAIN INTELLIGENCE WORKSPACE */}
      <ResumeIntelligence
        resumeId={id}
        resumeDetail={resume}
        onRefresh={loadResume}
        onOpenOriginalViewer={() => setShowOriginalModal(true)}
      />

      {showOriginalModal && (
        <OriginalResumeViewer
          isOpen={showOriginalModal}
          onClose={() => setShowOriginalModal(false)}
          resume={resume}
        />
      )}
    </div>
  );
}
