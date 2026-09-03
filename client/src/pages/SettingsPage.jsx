import React, { useState } from "react";
import { 
  Save, User, Briefcase, Settings2, AlertCircle, Plus, Trash2, 
  BrainCircuit, BookOpen, Bell, Sparkles, Sliders, CheckCircle 
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("career");

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
    defaultInterviewType: user?.interviewPreferences?.defaultInterviewType || "mixed",
    durationMinutes: user?.interviewPreferences?.durationMinutes || 30,
    techVsBehavioralRatio: user?.interviewPreferences?.techVsBehavioralRatio || "balanced",
    preferredQuestionCategories: arrayToCsv(user?.interviewPreferences?.preferredQuestionCategories),
    adaptiveQuestioning: user?.interviewPreferences?.adaptiveQuestioning ?? true,
    followUpQuestions: user?.interviewPreferences?.followUpQuestions ?? true,
    strictnessOfEvaluation: user?.interviewPreferences?.strictnessOfEvaluation || "standard",
    feedbackDepth: user?.interviewPreferences?.feedbackDepth || "detailed",

    responseStyle: user?.aiPreferences?.responseStyle || "detailed",
    coachingStyle: user?.aiPreferences?.coachingStyle || "rigorous",
    hintBehavior: user?.aiPreferences?.hintBehavior || "on_request",
    personalizedRecommendations: user?.aiPreferences?.personalizedRecommendations ?? true,

    dailyTargetMinutes: user?.preparationPreferences?.dailyTargetMinutes || 45,
    preferredLearningAreas: arrayToCsv(user?.preparationPreferences?.preferredLearningAreas),
    difficultyPreference: user?.preparationPreferences?.difficultyPreference || "adaptive",
    priorityTopics: arrayToCsv(user?.preparationPreferences?.priorityTopics),

    applicationReminders: user?.notificationPreferences?.applicationReminders ?? true,
    interviewReminders: user?.notificationPreferences?.interviewReminders ?? true,
    preparationReminders: user?.notificationPreferences?.preparationReminders ?? true,
    weeklySummaries: user?.notificationPreferences?.weeklySummaries ?? true,
    alerts: user?.notificationPreferences?.alerts ?? true
  }));

  const [targetRoles, setTargetRoles] = useState(() => {
    if (user?.targetRoles?.length > 0 && typeof user.targetRoles[0] === "string") {
      return user.targetRoles.map((r, i) => ({ title: r, techStack: "", isPrimary: i === 0 }));
    }
    if (user?.targetRoles?.length > 0) {
      return user.targetRoles.map(r => ({ ...r, techStack: arrayToCsv(r.techStack) }));
    }
    return [{ title: "", techStack: "", isPrimary: true }];
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
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
          defaultInterviewType: form.defaultInterviewType,
          durationMinutes: Number(form.durationMinutes),
          techVsBehavioralRatio: form.techVsBehavioralRatio,
          preferredQuestionCategories: csvToArray(form.preferredQuestionCategories),
          adaptiveQuestioning: form.adaptiveQuestioning,
          followUpQuestions: form.followUpQuestions,
          strictnessOfEvaluation: form.strictnessOfEvaluation,
          feedbackDepth: form.feedbackDepth
        },
        aiPreferences: {
          responseStyle: form.responseStyle,
          coachingStyle: form.coachingStyle,
          hintBehavior: form.hintBehavior,
          personalizedRecommendations: form.personalizedRecommendations
        },
        preparationPreferences: {
          dailyTargetMinutes: Number(form.dailyTargetMinutes),
          preferredLearningAreas: csvToArray(form.preferredLearningAreas),
          difficultyPreference: form.difficultyPreference,
          priorityTopics: csvToArray(form.priorityTopics)
        },
        notificationPreferences: {
          applicationReminders: form.applicationReminders,
          interviewReminders: form.interviewReminders,
          preparationReminders: form.preparationReminders,
          weeklySummaries: form.weeklySummaries,
          alerts: form.alerts
        }
      });
      setMessage("Preferences and career settings updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "career", label: "Career Profile", icon: Briefcase },
    { id: "interview", label: "Interview Control", icon: Sliders },
    { id: "ai", label: "AI Persona Style", icon: Sparkles },
    { id: "preparation", label: "Preparation Targets", icon: BookOpen },
    { id: "notifications", label: "Notifications", icon: Bell }
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            System Preferences
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Settings & Preferences</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Configure target role requirements, AI evaluation strictness, and system preferences.
          </p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-border gap-1 overflow-x-auto bg-surface p-1 rounded-lg border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-white shadow-2xs"
                  : "text-text-secondary hover:text-text hover:bg-bg-secondary"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. CAREER PROFILE TAB */}
        {activeTab === "career" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                  <User size={15} className="text-primary" /> Personal & Education Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Full Name" name="name" onChange={updateField} required value={form.name} />
                  <Input label="Phone Number" name="phone" onChange={updateField} value={form.phone} />
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

            <Card>
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                  <Briefcase size={15} className="text-primary" /> Target Roles & Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                
                {/* Target Roles */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-text m-0">Target Roles</h4>
                    <Button type="button" variant="outline" size="xs" onClick={addTargetRole}>
                      <Plus size={14} className="mr-1" /> Add Role
                    </Button>
                  </div>
                  {targetRoles.map((role, idx) => (
                    <div key={idx} className="p-3 border border-border rounded-lg bg-bg-secondary/40 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-text cursor-pointer">
                          <input 
                            type="radio" 
                            name="primaryRole" 
                            checked={role.isPrimary} 
                            onChange={() => setPrimaryRole(idx)}
                            className="cursor-pointer text-primary" 
                          />
                          Primary Role
                        </label>
                        <button 
                          type="button" 
                          onClick={() => removeTargetRole(idx)} 
                          className="text-text-muted hover:text-rose-600 transition-colors"
                          title="Remove Role"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Experience Level</label>
                    <select 
                      name="experienceLevel" 
                      onChange={updateField} 
                      value={form.experienceLevel}
                      className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                    >
                      <option value="student">Student</option>
                      <option value="fresher">Fresher</option>
                      <option value="intern">Intern</option>
                      <option value="junior">Junior</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Remote Preference</label>
                    <select 
                      name="remotePreference" 
                      onChange={updateField} 
                      value={form.remotePreference}
                      className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                    >
                      <option value="any">Any</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </div>
                  <Input 
                    label="Target Companies" 
                    name="targetCompanies" 
                    onChange={updateField} 
                    value={form.targetCompanies} 
                    placeholder="Google, Stripe, Startups"
                  />
                  <Input 
                    label="Preferred Locations" 
                    name="preferredLocations" 
                    onChange={updateField} 
                    value={form.preferredLocations} 
                  />
                  <Input 
                    label="Expected Salary" 
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
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2. INTERVIEW PREFERENCES TAB */}
        {activeTab === "interview" && (
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <Sliders size={15} className="text-primary" /> AI Interviewer Persona Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Default Difficulty</label>
                  <select 
                    name="defaultDifficulty" 
                    onChange={updateField} 
                    value={form.defaultDifficulty}
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                  >
                    <option value="easy">Easy (Intern / Entry)</option>
                    <option value="medium">Medium (Mid-level)</option>
                    <option value="hard">Hard (Senior / Lead)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Default Interview Type</label>
                  <select
                    name="defaultInterviewType"
                    onChange={updateField}
                    value={form.defaultInterviewType}
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                  >
                    <option value="technical">Technical Focus</option>
                    <option value="hr">Behavioral (HR)</option>
                    <option value="project">Project Deep Dive</option>
                    <option value="mixed">Mixed Strategy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Session Duration</label>
                  <select
                    name="durationMinutes"
                    onChange={updateField}
                    value={form.durationMinutes}
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                  >
                    <option value={15}>15 Mins (Quick Drill)</option>
                    <option value={30}>30 Mins (Standard)</option>
                    <option value={45}>45 Mins (Full Round)</option>
                    <option value={60}>60 Mins (Marathon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Evaluation Strictness</label>
                  <select
                    name="strictnessOfEvaluation"
                    onChange={updateField}
                    value={form.strictnessOfEvaluation}
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                  >
                    <option value="gentle">Gentle & Supportive</option>
                    <option value="standard">Standard Industry Criteria</option>
                    <option value="strict">Strict Top-Tech Standard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface cursor-pointer">
                  <div>
                    <strong className="text-xs font-bold text-text block">Adaptive Difficulty Scaling</strong>
                    <span className="text-[10px] text-text-muted">Dynamically scale follow-up questions based on answer depth.</span>
                  </div>
                  <input
                    type="checkbox"
                    name="adaptiveQuestioning"
                    checked={form.adaptiveQuestioning}
                    onChange={updateField}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface cursor-pointer">
                  <div>
                    <strong className="text-xs font-bold text-text block">Deep Follow-Up Probe Questions</strong>
                    <span className="text-[10px] text-text-muted">Interviewer probes partial answers to test technical depth.</span>
                  </div>
                  <input
                    type="checkbox"
                    name="followUpQuestions"
                    checked={form.followUpQuestions}
                    onChange={updateField}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. AI PREFERENCES TAB */}
        {activeTab === "ai" && (
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <BrainCircuit size={15} className="text-primary" /> AI Coaching Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Coaching Style</label>
                  <select
                    name="coachingStyle"
                    onChange={updateField}
                    value={form.coachingStyle}
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                  >
                    <option value="encouraging">Encouraging & Constructive</option>
                    <option value="rigorous">Rigorous & Analytical</option>
                    <option value="socratic">Socratic (Probing Questions)</option>
                    <option value="direct">Direct & Concise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Response Style</label>
                  <select
                    name="responseStyle"
                    onChange={updateField}
                    value={form.responseStyle}
                    className="w-full bg-surface border border-border rounded-lg h-9 px-2 text-xs font-semibold text-text outline-none focus:border-primary"
                  >
                    <option value="concise">Concise & Direct</option>
                    <option value="detailed">Detailed with Examples</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. PREPARATION TARGETS TAB */}
        {activeTab === "preparation" && (
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <BookOpen size={15} className="text-primary" /> Daily Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-secondary">Daily Target (Minutes)</label>
                  <span className="text-xs font-bold text-primary bg-primary-bg px-2 py-0.5 rounded border border-primary-border">
                    {form.dailyTargetMinutes} mins / day
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="15"
                  name="dailyTargetMinutes"
                  value={form.dailyTargetMinutes}
                  onChange={updateField}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <Input
                label="Priority Topics (comma separated)"
                name="priorityTopics"
                value={form.priorityTopics}
                onChange={updateField}
                placeholder="System Design, React Performance, SQL"
              />
            </CardContent>
          </Card>
        )}

        {/* 5. NOTIFICATION PREFERENCES TAB */}
        {activeTab === "notifications" && (
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                <Bell size={15} className="text-primary" /> Notifications & Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-2">
              <label className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface cursor-pointer">
                <div>
                  <strong className="text-xs font-bold text-text block">Application Reminders</strong>
                  <span className="text-[10px] text-text-muted">Follow-up notifications for tracked job applications.</span>
                </div>
                <input
                  type="checkbox"
                  name="applicationReminders"
                  checked={form.applicationReminders}
                  onChange={updateField}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface cursor-pointer">
                <div>
                  <strong className="text-xs font-bold text-text block">Interview Practice Alerts</strong>
                  <span className="text-[10px] text-text-muted">Notifications before scheduled practice rounds.</span>
                </div>
                <input
                  type="checkbox"
                  name="interviewReminders"
                  checked={form.interviewReminders}
                  onChange={updateField}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface cursor-pointer">
                <div>
                  <strong className="text-xs font-bold text-text block">Weekly Career Intelligence Reports</strong>
                  <span className="text-[10px] text-text-muted">Weekly digest of readiness progress and skill gap improvements.</span>
                </div>
                <input
                  type="checkbox"
                  name="weeklySummaries"
                  checked={form.weeklySummaries}
                  onChange={updateField}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
              </label>
            </CardContent>
          </Card>
        )}

        {/* FEEDBACK MESSAGES */}
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={15} />
            {message}
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* SAVE BUTTON */}
        <div className="flex justify-end">
          <Button type="submit" isLoading={saving} size="md" className="px-6">
            <Save size={15} className="mr-1.5" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
