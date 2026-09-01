import React, { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import api from "../../api/axios";
import { Spinner } from "../ui/Spinner";

export default function ResumeEditor({ data, onChange, resumeId }) {
  if (!data) return <div className="p-4">Loading editor...</div>;

  const handleChange = (section, field, value, index = null) => {
    const newData = { ...data };
    if (index !== null) {
      if (!newData[section]) newData[section] = [];
      newData[section][index] = { ...newData[section][index], [field]: value };
    } else {
      if (typeof newData[section] === "object" && !Array.isArray(newData[section])) {
        newData[section] = { ...newData[section], [field]: value };
      } else {
        newData[section] = value;
      }
    }
    onChange(newData);
  };

  const handleArrayChange = (section, value) => {
    onChange({ ...data, [section]: value });
  };

  const addExperience = () => {
    const exp = data.experience || [];
    onChange({ ...data, experience: [{ company: "", role: "", description: "" }, ...exp] });
  };

  const removeExperience = (idx) => {
    const exp = [...data.experience];
    exp.splice(idx, 1);
    onChange({ ...data, experience: exp });
  };

  const addEducation = () => {
    const edu = data.education || [];
    onChange({ ...data, education: [{ institution: "", degree: "", branch: "", startYear: "", endYear: "", gpa: "" }, ...edu] });
  };

  const removeEducation = (idx) => {
    const edu = [...data.education];
    edu.splice(idx, 1);
    onChange({ ...data, education: edu });
  };

  const addProject = () => {
    const proj = data.projects || [];
    onChange({ ...data, projects: [{ name: "", description: "", technologies: "", link: "" }, ...proj] });
  };

  const removeProject = (idx) => {
    const proj = [...data.projects];
    proj.splice(idx, 1);
    onChange({ ...data, projects: proj });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Basics */}
      <section className="bg-surface p-4 rounded-xl border border-border">
        <h2 className="text-sm font-bold text-text mb-4 uppercase tracking-wider">Contact Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Name" 
            value={data.name || data.basics?.name || ""} 
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...data, name: val, basics: { ...data.basics, name: val } });
            }} 
          />
          <Input 
            label="Email" 
            value={data.email || data.basics?.email || ""} 
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...data, email: val, basics: { ...data.basics, email: val } });
            }} 
          />
          <Input 
            label="Phone" 
            value={data.phone || data.basics?.phone || ""} 
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...data, phone: val, basics: { ...data.basics, phone: val } });
            }} 
          />
          <Input 
            label="Location" 
            value={data.location || data.basics?.location || ""} 
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...data, location: val, basics: { ...data.basics, location: val } });
            }} 
          />
        </div>
      </section>

      {/* Summary */}
      <section className="bg-surface p-4 rounded-xl border border-border">
        <h2 className="text-sm font-bold text-text mb-4 uppercase tracking-wider">Professional Summary</h2>
        <SmartTextarea
          value={data.summary || ""}
          onChange={(val) => handleChange("summary", null, val)}
          resumeId={resumeId}
          context="Professional Summary"
        />
      </section>

      {/* Experience */}
      <section className="bg-surface p-4 rounded-xl border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Experience</h2>
          <button onClick={addExperience} className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
            <Plus size={13}/> Add Role
          </button>
        </div>
        <div className="space-y-6">
          {(data.experience || []).map((exp, idx) => (
            <div key={idx} className="relative p-4 border border-border rounded-lg bg-bg-secondary">
              <button onClick={() => removeExperience(idx)} className="absolute top-2 right-2 text-danger opacity-50 hover:opacity-100">
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <Input label="Role" value={exp.role || ""} onChange={(e) => handleChange("experience", "role", e.target.value, idx)} />
                <Input label="Company" value={exp.company || ""} onChange={(e) => handleChange("experience", "company", e.target.value, idx)} />
                <Input label="Start Date" value={exp.startDate || ""} onChange={(e) => handleChange("experience", "startDate", e.target.value, idx)} />
                <Input label="End Date" value={exp.endDate || ""} onChange={(e) => handleChange("experience", "endDate", e.target.value, idx)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Description</label>
                <SmartTextarea
                  value={exp.description || ""}
                  onChange={(val) => handleChange("experience", "description", val, idx)}
                  resumeId={resumeId}
                  context={`Experience Description for ${exp.role} at ${exp.company}`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Education */}
      <section className="bg-surface p-4 rounded-xl border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Education</h2>
          <button onClick={addEducation} className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
            <Plus size={13}/> Add Education
          </button>
        </div>
        <div className="space-y-6">
          {(data.education || []).map((edu, idx) => (
            <div key={idx} className="relative p-4 border border-border rounded-lg bg-bg-secondary">
              <button onClick={() => removeEducation(idx)} className="absolute top-2 right-2 text-danger opacity-50 hover:opacity-100">
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Institution" value={edu.institution || ""} onChange={(e) => handleChange("education", "institution", e.target.value, idx)} />
                <Input label="Degree" value={edu.degree || ""} onChange={(e) => handleChange("education", "degree", e.target.value, idx)} />
                <Input label="Branch / Major" value={edu.branch || ""} onChange={(e) => handleChange("education", "branch", e.target.value, idx)} />
                <Input label="GPA" value={edu.gpa || ""} onChange={(e) => handleChange("education", "gpa", e.target.value, idx)} />
                <Input label="Start Year" value={edu.startYear || ""} onChange={(e) => handleChange("education", "startYear", e.target.value, idx)} />
                <Input label="End Year" value={edu.endYear || ""} onChange={(e) => handleChange("education", "endYear", e.target.value, idx)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section className="bg-surface p-4 rounded-xl border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Projects</h2>
          <button onClick={addProject} className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
            <Plus size={13}/> Add Project
          </button>
        </div>
        <div className="space-y-6">
          {(data.projects || []).map((proj, idx) => (
            <div key={idx} className="relative p-4 border border-border rounded-lg bg-bg-secondary">
              <button onClick={() => removeProject(idx)} className="absolute top-2 right-2 text-danger opacity-50 hover:opacity-100">
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <Input label="Project Name" value={proj.name || ""} onChange={(e) => handleChange("projects", "name", e.target.value, idx)} />
                <Input label="Link / URL" value={proj.link || ""} onChange={(e) => handleChange("projects", "link", e.target.value, idx)} />
              </div>
              <div className="mb-3">
                <Input 
                  label="Technologies (comma separated)" 
                  value={Array.isArray(proj.technologies) ? proj.technologies.join(", ") : proj.technologies || ""} 
                  onChange={(e) => {
                    const techArr = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                    handleChange("projects", "technologies", techArr, idx);
                  }} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Description</label>
                <SmartTextarea
                  value={proj.description || ""}
                  onChange={(val) => handleChange("projects", "description", val, idx)}
                  resumeId={resumeId}
                  context={`Project Description for ${proj.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Skills */}
      <section className="bg-surface p-4 rounded-xl border border-border">
        <h2 className="text-sm font-bold text-text mb-4 uppercase tracking-wider">Skills (Comma separated)</h2>
        <textarea 
          className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[80px]"
          value={(data.skills || []).map(s => typeof s === 'string' ? s : (s.canonicalName || s.name || '')).filter(Boolean).join(", ")}
          onChange={(e) => {
            const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
            handleArrayChange("skills", arr);
          }}
        />
      </section>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-bold text-text-secondary mb-1">{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={onChange}
        className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
      />
    </div>
  );
}

function SmartTextarea({ value, onChange, resumeId, context }) {
  const [improving, setImproving] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  const handleImprove = async () => {
    if (!instruction) return;
    try {
      setImproving(true);
      const res = await api.post(`/resumes/${resumeId}/ai-suggest`, {
        text: value,
        context,
        instruction
      });
      onChange(res.data.data);
      setShowPrompt(false);
      setInstruction("");
    } catch (err) {
      console.error(err);
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="relative group">
      <textarea
        className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[100px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setShowPrompt(!showPrompt)}
          className="bg-primary hover:bg-primary-hover text-bg p-1.5 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          title="AI Improve"
        >
          <Wand2 size={16} />
        </button>
      </div>

      {showPrompt && (
        <div className="mt-2 p-3 bg-surface border border-border rounded-lg flex gap-2 animate-in slide-in-from-top-2">
          <input
            type="text"
            className="flex-1 bg-bg-secondary border border-border rounded text-xs px-2 py-1 outline-none focus:border-primary"
            placeholder="E.g., Make it sound more professional and action-oriented..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImprove()}
          />
          <button 
            onClick={handleImprove} 
            disabled={improving}
            className="bg-primary text-bg px-3 py-1 rounded text-xs font-bold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1"
          >
            {improving ? <Spinner size="xs" /> : "Improve"}
          </button>
        </div>
      )}
    </div>
  );
}
