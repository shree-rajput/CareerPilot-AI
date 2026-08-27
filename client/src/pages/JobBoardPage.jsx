import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Target, BriefcaseBusiness, Building2, MapPin } from "lucide-react";
import { jobApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

export function JobBoardPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    employmentType: "",
    experienceLevel: "",
    url: "",
    description: "",
  });

  useEffect(() => {
    loadJobs();
  }, [search]);

  async function loadJobs() {
    try {
      // jobApi.getJobs expects a wrapper of { status, data } based on standard backend setup
      const res = await jobApi.getJobs({ search });
      // Depending on backend structure, it might return just an array or { data: [] }
      setJobs(res.data || res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitJob(e) {
    e.preventDefault();
    try {
      await jobApi.createJob(form);
      setShowAdd(false);
      setForm({
        title: "", company: "", location: "", employmentType: "", experienceLevel: "", url: "", description: ""
      });
      loadJobs();
    } catch (err) {
      alert("Failed to save job.");
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">Job Board</h1>
          <p className="text-text-secondary text-sm mt-1">Track target roles and let AI extract key skills.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus size={18} className="mr-2" /> Add Target Job
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search by title or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </CardContent>
      </Card>

      {showAdd && (
        <Card className="animate-in fade-in zoom-in-95 duration-200 border-primary shadow-md">
          <CardContent className="p-6">
            <form onSubmit={submitJob} className="flex flex-col gap-5 max-w-2xl">
              <div>
                <h3 className="text-xl font-bold text-text">New Target Job</h3>
                <p className="text-sm text-text-secondary">AI will analyze the description to extract required skills.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input label="Job Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <Input label="Company" required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                <Input label="URL (optional)" type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
                
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Employment Type</label>
                  <select 
                    value={form.employmentType} 
                    onChange={e => setForm({ ...form, employmentType: e.target.value })}
                    className="bg-bg-secondary border border-border rounded-lg p-2.5 text-text focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Experience Level</label>
                  <select 
                    value={form.experienceLevel} 
                    onChange={e => setForm({ ...form, experienceLevel: e.target.value })}
                    className="bg-bg-secondary border border-border rounded-lg p-2.5 text-text focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="Entry level">Entry level</option>
                    <option value="Mid-Senior level">Mid-Senior level</option>
                    <option value="Director">Director</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Job Description (Required for AI Analysis)</label>
                <textarea
                  required
                  rows={6}
                  className="w-full bg-white border border-border rounded-lg p-3 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Paste the full job description here..."
                />
              </div>
              
              <div className="flex items-center gap-3 mt-2">
                <Button type="submit">Save & Analyze Job</Button>
                <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-secondary bg-surface rounded-xl border border-border shadow-sm">
              <Target className="mx-auto mb-3 h-10 w-10 text-border" />
              <p className="font-medium text-base">No tracked jobs found.</p>
              <p className="text-sm mt-1">Click 'Add Target Job' to start tracking.</p>
            </div>
          ) : (
            jobs.map(job => (
              <Card 
                key={job._id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/jobs/${job._id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-text group-hover:text-primary transition-colors line-clamp-2">
                      {job.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary text-sm font-medium mb-4">
                    <Building2 size={16} />
                    <span>{job.company}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 bg-bg-secondary px-2 py-1 rounded-md text-xs font-bold text-text-secondary">
                        <MapPin size={12} /> {job.location}
                      </span>
                    )}
                    {job.employmentType && (
                      <span className="inline-flex items-center gap-1 bg-bg-secondary px-2 py-1 rounded-md text-xs font-bold text-text-secondary">
                        <BriefcaseBusiness size={12} /> {job.employmentType}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-xs font-bold text-primary">
                      {job.requiredSkills?.length || 0} Required Skills
                    </span>
                    <span className="text-xs font-bold text-text-secondary">
                      Added {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
