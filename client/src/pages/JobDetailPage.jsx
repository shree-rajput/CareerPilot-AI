import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, Building2, MapPin, BriefcaseBusiness, 
  ExternalLink, Calendar, Trash2, CheckCircle2 
} from "lucide-react";
import { jobApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  async function loadJob() {
    try {
      const res = await jobApi.getJobById(id);
      setJob(res.data || res);
    } catch (err) {
      console.error(err);
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to remove this tracked job?")) return;
    
    setDeleting(true);
    try {
      await jobApi.deactivateJob(id);
      navigate("/jobs");
    } catch (err) {
      alert("Failed to delete job.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link 
          to="/jobs" 
          className="inline-flex items-center text-sm font-bold text-text-secondary hover:text-primary transition-colors w-fit"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Job Board
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-text tracking-tight mb-2">{job.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Building2 size={16} />
                <span className="text-text">{job.company}</span>
              </div>
              
              {job.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} />
                  <span>{job.location}</span>
                </div>
              )}
              
              {job.employmentType && (
                <div className="flex items-center gap-1.5">
                  <BriefcaseBusiness size={16} />
                  <span>{job.employmentType}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1.5">
                <Calendar size={16} />
                <span>Added {new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {job.url && (
              <Button variant="outline" onClick={() => window.open(job.url, "_blank")}>
                <ExternalLink size={16} className="mr-2" /> View Posting
              </Button>
            )}
            <Button variant="danger" disabled={deleting} onClick={handleDelete}>
              <Trash2 size={16} className="mr-2" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Left Column: Intelligence */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="shadow-sm border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <h3 className="text-lg font-bold text-text flex items-center mb-4">
                <CheckCircle2 size={18} className="text-primary mr-2" /> 
                AI Extracted Skills
              </h3>
              
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Required</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills?.length > 0 ? job.requiredSkills.map((s, i) => (
                      <Badge key={i} variant="primary">{s.skillName}</Badge>
                    )) : <span className="text-sm text-text-secondary">None found</span>}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Preferred</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills?.length > 0 ? job.preferredSkills.map((s, i) => (
                      <Badge key={i} variant="secondary">{s.skillName}</Badge>
                    )) : <span className="text-sm text-text-secondary">None found</span>}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Soft Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.softSkills?.length > 0 ? job.softSkills.map((s, i) => (
                      <Badge key={i} variant="outline">{s.skillName}</Badge>
                    )) : <span className="text-sm text-text-secondary">None found</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Original JD */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="shadow-sm h-full">
            <CardContent className="p-6 h-full flex flex-col">
              <h3 className="text-xl font-bold text-text mb-4 pb-4 border-b border-border">
                Job Description
              </h3>
              <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {job.description || "No description provided."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
