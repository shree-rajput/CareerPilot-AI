import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resumeApi } from "../api/resume";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { AlertTriangle, Sparkles, Layout, Save, CheckCircle, Clock } from "lucide-react";
import ResumeEditor from "../components/resume/ResumeEditor";
import ResumePreview from "../components/resume/ResumePreview";
import ResumeIntelligence from "../components/resume/ResumeIntelligence";
import api from "../api/axios";
import debounce from "lodash/debounce";

export function ResumeStudioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved, saving, error
  
  // Right panel view: "preview" or "intelligence"
  const [rightPanel, setRightPanel] = useState("preview");

  useEffect(() => {
    loadResume();
  }, [id]);

  const loadResume = async () => {
    try {
      setLoading(true);
      const data = await resumeApi.getOne(id);
      setResume(data.resume);
      setStructuredData(data.resume.structuredData || {});
    } catch (err) {
      setError("Failed to load resume");
    } finally {
      setLoading(false);
    }
  };

  // Debounced save
  const debouncedSaveDraft = useCallback(
    debounce(async (dataToSave) => {
      try {
        setSaveStatus("saving");
        await api.post(`/resumes/${id}/draft`, { structuredData: dataToSave });
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
      }
    }, 1000),
    [id]
  );

  const handleDataChange = (newData) => {
    setStructuredData(newData);
    setSaveStatus("saving");
    debouncedSaveDraft(newData);
  };

  const handleSaveVersion = async () => {
    try {
      setSaving(true);
      const res = await api.post(`/resumes/${id}/version`, {
        versionName: `${resume.name} (Saved)`,
        structuredData
      });
      // Navigate to the new version's studio or just back to resumes list
      navigate(`/resume/studio/${res.data.data._id}`);
    } catch (err) {
      setError("Failed to save version");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Spinner size="lg" /></div>;
  if (error) return <div className="p-10 text-danger">{error}</div>;
  if (!resume) return <div className="p-10">Resume not found</div>;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden animate-in fade-in">
      {/* LEFT: EDITOR (Scrollable) */}
      <div className="w-1/2 flex flex-col border-r border-border bg-bg-secondary">
        <div className="p-4 bg-surface border-b border-border flex justify-between items-center z-10 shadow-sm">
          <div>
            <h1 className="font-bold text-lg text-text truncate max-w-[300px]">{resume.name}</h1>
            <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
              {resume.isDraft ? <span className="text-warning flex items-center gap-1"><Clock size={12}/> Draft</span> : <span className="text-success flex items-center gap-1"><CheckCircle size={12}/> Saved Version</span>}
              <span>• Version {resume.version}</span>
              <span className="flex items-center gap-1">
                {saveStatus === "saving" ? <Spinner size="xs" /> : saveStatus === "error" ? <AlertTriangle size={12} className="text-danger" /> : <CheckCircle size={12} className="text-success" />}
                {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Save failed" : "All changes saved"}
              </span>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={handleSaveVersion} disabled={saving} className="flex items-center gap-2">
            <Save size={16} /> Save as New Version
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <ResumeEditor data={structuredData} onChange={handleDataChange} resumeId={id} />
        </div>
      </div>

      {/* RIGHT: PREVIEW / INTELLIGENCE (Scrollable/Fixed) */}
      <div className="w-1/2 flex flex-col bg-bg">
        <div className="p-2 border-b border-border flex gap-2 bg-surface">
          <Button 
            variant={rightPanel === "preview" ? "primary" : "outline"} 
            size="sm" 
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => setRightPanel("preview")}
          >
            <Layout size={16} /> Live Preview
          </Button>
          <Button 
            variant={rightPanel === "intelligence" ? "primary" : "outline"} 
            size="sm" 
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => setRightPanel("intelligence")}
          >
            <Sparkles size={16} /> Intelligence & ATS
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-[#525659] p-6 relative">
           {rightPanel === "preview" ? (
              <ResumePreview data={structuredData} />
           ) : (
              <ResumeIntelligence resumeId={id} structuredData={structuredData} />
           )}
        </div>
      </div>
    </div>
  );
}
