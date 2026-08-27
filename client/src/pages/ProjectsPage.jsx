import React, { useEffect, useState } from "react";
import { Plus, Search, FolderGit2, Code2, BrainCircuit, CheckCircle2, Wand2 } from "lucide-react";
import { projectApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    role: "",
    architecture: "",
    technologies: "",
    achievements: "",
    complexity: "medium"
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await projectApi.getProjects();
      setProjects(res.data || res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitProject(e) {
    e.preventDefault();
    try {
      // Convert comma-separated strings to arrays
      const dataToSubmit = {
        ...form,
        technologies: form.technologies.split(",").map(s => s.trim()).filter(Boolean),
        achievements: form.achievements.split("\n").map(s => s.trim()).filter(Boolean),
      };
      
      await projectApi.createProject(dataToSubmit);
      setShowAdd(false);
      setForm({ name: "", description: "", role: "", architecture: "", technologies: "", achievements: "", complexity: "medium" });
      loadProjects();
    } catch (err) {
      alert("Failed to save project.");
    }
  }

  async function handleGenerateKit(id) {
    setGeneratingId(id);
    try {
      await projectApi.generateInterviewKit(id);
      await loadProjects(); // Reload to get the new kit
    } catch (err) {
      alert("Failed to generate interview kit.");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">Portfolio Projects</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your projects and generate AI interview prep kits.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus size={18} className="mr-2" /> Add Project
        </Button>
      </div>

      {showAdd && (
        <Card className="animate-in fade-in zoom-in-95 duration-200 border-primary shadow-md">
          <CardContent className="p-6">
            <form onSubmit={submitProject} className="flex flex-col gap-5">
              <div>
                <h3 className="text-xl font-bold text-text">New Project</h3>
                <p className="text-sm text-text-secondary">Add details to help AI generate a tailored interview kit.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="Project Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input label="Your Role (e.g. Lead Developer, Full Stack)" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
                
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Technologies (comma-separated)</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-bg-secondary border border-border rounded-lg p-2.5 text-text focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                    value={form.technologies}
                    onChange={e => setForm({ ...form, technologies: e.target.value })}
                    placeholder="React, Node.js, MongoDB..."
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Complexity</label>
                  <select 
                    value={form.complexity} 
                    onChange={e => setForm({ ...form, complexity: e.target.value })}
                    className="bg-bg-secondary border border-border rounded-lg p-2.5 text-text focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Architecture / System Design</label>
                <textarea
                  rows={2}
                  className="w-full bg-white border border-border rounded-lg p-3 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  value={form.architecture}
                  onChange={e => setForm({ ...form, architecture: e.target.value })}
                  placeholder="Describe the high-level architecture (e.g., Microservices with Docker, Serverless AWS)..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Project Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-white border border-border rounded-lg p-3 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this project and what problem does it solve?"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Key Achievements (One per line)</label>
                <textarea
                  rows={3}
                  className="w-full bg-white border border-border rounded-lg p-3 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  value={form.achievements}
                  onChange={e => setForm({ ...form, achievements: e.target.value })}
                  placeholder="Reduced latency by 50%...&#10;Implemented OAuth2..."
                />
              </div>
              
              <div className="flex items-center gap-3 mt-2">
                <Button type="submit">Save Project</Button>
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
        <div className="grid grid-cols-1 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-secondary bg-surface rounded-xl border border-border shadow-sm">
              <FolderGit2 className="mx-auto mb-3 h-10 w-10 text-border" />
              <p className="font-medium text-base">No projects added yet.</p>
              <p className="text-sm mt-1">Click 'Add Project' to get started.</p>
            </div>
          ) : (
            projects.map(project => (
              <Card key={project._id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Project Details */}
                      <div className="flex-1 flex flex-col gap-4">
                        <div>
                          <h3 className="font-bold text-2xl text-text mb-1">{project.name}</h3>
                          {project.role && <p className="text-sm font-bold text-primary">{project.role}</p>}
                        </div>
                        
                        <p className="text-text-secondary text-sm">{project.description}</p>
                        
                        {project.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((t, i) => (
                              <Badge key={i} variant="secondary">{t}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {project.architecture && (
                          <div>
                            <span className="text-xs font-bold text-text-secondary uppercase">Architecture</span>
                            <p className="text-sm text-text font-medium mt-1">{project.architecture}</p>
                          </div>
                        )}
                        
                        {project.achievements?.length > 0 && (
                          <div>
                            <span className="text-xs font-bold text-text-secondary uppercase">Achievements</span>
                            <ul className="mt-1 flex flex-col gap-1">
                              {project.achievements.map((a, i) => (
                                <li key={i} className="text-sm text-text flex items-start">
                                  <CheckCircle2 size={14} className="text-success mt-0.5 mr-2 shrink-0" />
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Interview Kit Section */}
                      <div className="w-full lg:w-1/3 bg-bg-secondary p-5 rounded-xl border border-border flex flex-col">
                        <div className="flex items-center gap-2 mb-4 text-text font-bold">
                          <BrainCircuit size={18} className="text-primary" />
                          <span>AI Interview Kit</span>
                        </div>
                        
                        {project.interviewKit && project.interviewKit.length > 0 ? (
                          <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                            {project.interviewKit.map((q, i) => (
                              <div key={i} className="bg-surface p-3 rounded-lg border border-border shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <Badge variant={q.difficulty === 'Hard' ? 'danger' : q.difficulty === 'Medium' ? 'warning' : 'success'}>
                                    {q.difficulty}
                                  </Badge>
                                  <span className="text-xs font-bold text-text-secondary">{q.category}</span>
                                </div>
                                <p className="text-sm font-medium text-text">{q.question}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl">
                            <Wand2 size={32} className="text-text-secondary mb-3" />
                            <p className="text-sm text-text-secondary mb-4">
                              Generate a tailored list of interview questions likely to be asked about this project.
                            </p>
                            <Button 
                              onClick={() => handleGenerateKit(project._id)}
                              disabled={generatingId === project._id}
                            >
                              {generatingId === project._id ? (
                                <><Spinner size="sm" className="mr-2" /> Generating...</>
                              ) : (
                                "Generate Kit"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
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
