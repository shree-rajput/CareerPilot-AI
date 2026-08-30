import React, { useState } from "react";
import { Save, User, Briefcase, Settings2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";

function csvToArray(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToCsv(value = []) {
  return value.join(", ");
}

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  
  const [form, setForm] = useState(() => ({
    name: user?.name || "",
    phone: user?.phone || "",
    institution: user?.education?.institution || "",
    degree: user?.education?.degree || "",
    branch: user?.education?.branch || "",
    graduationYear: user?.education?.graduationYear || "",
    experienceLevel: user?.experienceLevel || "student",
    preferredLocations: arrayToCsv(user?.preferredLocations),
    remotePreference: user?.remotePreference || "any",
    salaryExpectation: user?.salaryExpectation || "",
    targetCompanies: arrayToCsv(user?.targetCompanies),
    placementDeadline: user?.placementDeadline ? new Date(user.placementDeadline).toISOString().split("T")[0] : "",
    technicalSkills: arrayToCsv(user?.technicalSkills),
    defaultDifficulty: user?.interviewPreferences?.defaultDifficulty || "medium",
    defaultInterviewType: user?.interviewPreferences?.defaultInterviewType || "mixed"
  }));

  const [targetRoles, setTargetRoles] = useState(() => {
    // If old string array, migrate safely (legacy compatibility)
    if (user?.targetRoles?.length > 0 && typeof user.targetRoles[0] === 'string') {
      return user.targetRoles.map((r, i) => ({ title: r, techStack: "", isPrimary: i === 0 }));
    }
    // If new structured array
    if (user?.targetRoles?.length > 0) {
      return user.targetRoles.map(r => ({ ...r, techStack: arrayToCsv(r.techStack) }));
    }
    return [{ title: "", techStack: "", isPrimary: true }];
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function addTargetRole() {
    setTargetRoles([...targetRoles, { title: "", techStack: "", isPrimary: targetRoles.length === 0 }]);
  }

  function removeTargetRole(index) {
    const newRoles = [...targetRoles];
    const removed = newRoles.splice(index, 1)[0];
    if (removed.isPrimary && newRoles.length > 0) {
      newRoles[0].isPrimary = true;
    }
    setTargetRoles(newRoles);
  }

  function updateTargetRole(index, field, value) {
    const newRoles = [...targetRoles];
    newRoles[index][field] = value;
    setTargetRoles(newRoles);
  }

  function setPrimaryRole(index) {
    const newRoles = targetRoles.map((r, i) => ({ ...r, isPrimary: i === index }));
    setTargetRoles(newRoles);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
        education: {
          institution: form.institution,
          degree: form.degree,
          branch: form.branch,
          graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined
        },
        experienceLevel: form.experienceLevel,
        targetRoles: targetRoles
          .filter(r => r.title.trim() !== "")
          .map(r => ({
            title: r.title,
            techStack: csvToArray(r.techStack),
            isPrimary: r.isPrimary
          })),
        targetCompanies: csvToArray(form.targetCompanies),
        preferredLocations: csvToArray(form.preferredLocations),
        remotePreference: form.remotePreference,
        salaryExpectation: form.salaryExpectation,
        placementDeadline: form.placementDeadline || undefined,
        technicalSkills: csvToArray(form.technicalSkills),
        interviewPreferences: {
          defaultDifficulty: form.defaultDifficulty,
          defaultInterviewType: form.defaultInterviewType
        }
      });
      setMessage("Profile saved successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your profile and career preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Profile Section */}
        <Card className="shadow-sm border-border overflow-hidden">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
            <div className="bg-primary/10 p-1.5 rounded-md text-primary">
              <User size={18} />
            </div>
            <CardTitle className="text-lg m-0">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Full Name" name="name" onChange={updateField} required value={form.name} />
              <Input label="Phone Number" name="phone" onChange={updateField} value={form.phone} />
              <div className="md:col-span-2 mt-2">
                <h4 className="text-sm font-bold text-text mb-3">Education</h4>
              </div>
              <Input label="Institution" name="institution" onChange={updateField} value={form.institution} />
              <Input label="Degree" name="degree" onChange={updateField} value={form.degree} />
              <Input label="Branch / Major" name="branch" onChange={updateField} value={form.branch} />
              <Input
                label="Graduation Year"
                max="2100"
                min="1950"
                name="graduationYear"
                onChange={updateField}
                type="number"
                value={form.graduationYear}
              />
            </div>
          </CardContent>
        </Card>

        {/* Career Targets Section */}
        <Card className="shadow-sm border-border overflow-hidden">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
            <div className="bg-info-bg border border-blue-200 p-1.5 rounded-md text-primary">
              <Briefcase size={18} />
            </div>
            <CardTitle className="text-lg m-0">Career Targets & Preferences</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col gap-6">
            
            {/* Target Roles (Dynamic List) */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-text">Target Roles</h4>
                <Button type="button" variant="outline" size="sm" onClick={addTargetRole}>
                  <Plus size={16} className="mr-1" /> Add Role
                </Button>
              </div>
              {targetRoles.map((role, idx) => (
                <div key={idx} className="p-4 border border-border rounded-lg bg-bg-secondary/50 flex flex-col gap-4 relative">
                  <div className="absolute top-4 right-4 flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                      <input 
                        type="radio" 
                        name="primaryRole" 
                        checked={role.isPrimary} 
                        onChange={() => setPrimaryRole(idx)}
                        className="cursor-pointer text-primary" 
                      />
                      Primary
                    </label>
                    <button 
                      type="button" 
                      onClick={() => removeTargetRole(idx)} 
                      className="text-text-secondary hover:text-danger transition-colors"
                      title="Remove Role"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-24">
                    <Input 
                      label="Role Title" 
                      value={role.title} 
                      onChange={(e) => updateTargetRole(idx, 'title', e.target.value)} 
                      placeholder="e.g. Frontend Engineer" 
                    />
                    <Input 
                      label="Tech Stack (comma separated)" 
                      value={role.techStack} 
                      onChange={(e) => updateTargetRole(idx, 'techStack', e.target.value)} 
                      placeholder="e.g. React, Node.js" 
                    />
                  </div>
                </div>
              ))}
            </div>

            <hr className="border-border" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Experience Level</label>
                <select 
                  name="experienceLevel" 
                  onChange={updateField} 
                  value={form.experienceLevel}
                  className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none cursor-pointer"
                >
                  <option value="student">Student</option>
                  <option value="fresher">Fresher</option>
                  <option value="intern">Intern</option>
                  <option value="junior">Junior</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Remote Preference</label>
                <select 
                  name="remotePreference" 
                  onChange={updateField} 
                  value={form.remotePreference}
                  className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none cursor-pointer"
                >
                  <option value="any">Any</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
              <Input 
                label="Target Companies (comma separated)" 
                name="targetCompanies" 
                onChange={updateField} 
                value={form.targetCompanies} 
                placeholder="e.g. Google, Stripe, Startups"
              />
              <Input 
                label="Preferred Locations (comma separated)" 
                name="preferredLocations" 
                onChange={updateField} 
                value={form.preferredLocations} 
              />
              <Input 
                label="Expected Salary (e.g. $100k - $120k)" 
                name="salaryExpectation" 
                onChange={updateField} 
                value={form.salaryExpectation} 
              />
              <Input 
                label="Placement Deadline" 
                name="placementDeadline" 
                type="date"
                onChange={updateField} 
                value={form.placementDeadline} 
              />
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Technical Skills (AI Extracted)</label>
                {form.technicalSkills ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-bg-secondary rounded-lg border border-border">
                    {csvToArray(form.technicalSkills).map((skill, idx) => (
                      <span key={idx} className="bg-surface border border-border px-2.5 py-1 rounded-md text-xs font-semibold text-text">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-text-secondary italic">No skills extracted yet. Upload a resume to populate your profile.</div>
                )}
                <p className="text-xs text-text-secondary">
                  Your technical skills are automatically extracted from your resumes, projects, and interview performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Defaults Section */}
        <Card className="shadow-sm border-border overflow-hidden">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
            <div className="bg-purple-100 border border-purple-200 p-1.5 rounded-md text-purple-600">
              <Settings2 size={18} />
            </div>
            <CardTitle className="text-lg m-0">Interview Defaults</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Difficulty</label>
                <select 
                  name="defaultDifficulty" 
                  onChange={updateField} 
                  value={form.defaultDifficulty}
                  className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Interview Type</label>
                <select
                  name="defaultInterviewType"
                  onChange={updateField}
                  value={form.defaultInterviewType}
                  className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow appearance-none cursor-pointer"
                >
                  <option value="technical">Technical</option>
                  <option value="hr">HR</option>
                  <option value="project">Project</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        {message && (
          <div className="bg-success-bg border border-success/20 text-success px-4 py-3 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            {message}
          </div>
        )}
        {error && (
          <div className="bg-danger-bg border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm font-medium shadow-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex justify-end mt-2">
          <Button type="submit" isLoading={saving} className="w-full sm:w-auto px-8">
            <Save size={18} className="mr-2" />
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
