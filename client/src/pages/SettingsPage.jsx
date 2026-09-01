import React, { useState } from "react";
import { 
  Save, User, Briefcase, Settings2, AlertCircle, Plus, Trash2, 
  BrainCircuit, BookOpen, Bell, Sparkles, Sliders, Shield, CheckCircle 
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
    // Career Profile
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

    // Interview Preferences
    defaultDifficulty: user?.interviewPreferences?.defaultDifficulty || "medium",
    defaultInterviewType: user?.interviewPreferences?.defaultInterviewType || "mixed",
    durationMinutes: user?.interviewPreferences?.durationMinutes || 30,
    techVsBehavioralRatio: user?.interviewPreferences?.techVsBehavioralRatio || "balanced",
    preferredQuestionCategories: arrayToCsv(user?.interviewPreferences?.preferredQuestionCategories),
    adaptiveQuestioning: user?.interviewPreferences?.adaptiveQuestioning ?? true,
    followUpQuestions: user?.interviewPreferences?.followUpQuestions ?? true,
    strictnessOfEvaluation: user?.interviewPreferences?.strictnessOfEvaluation || "standard",
    feedbackDepth: user?.interviewPreferences?.feedbackDepth || "detailed",

    // AI Preferences
    responseStyle: user?.aiPreferences?.responseStyle || "detailed",
    coachingStyle: user?.aiPreferences?.coachingStyle || "rigorous",
    hintBehavior: user?.aiPreferences?.hintBehavior || "on_request",
    personalizedRecommendations: user?.aiPreferences?.personalizedRecommendations ?? true,

    // Preparation Preferences
    dailyTargetMinutes: user?.preparationPreferences?.dailyTargetMinutes || 45,
    preferredLearningAreas: arrayToCsv(user?.preparationPreferences?.preferredLearningAreas),
    difficultyPreference: user?.preparationPreferences?.difficultyPreference || "adaptive",
    priorityTopics: arrayToCsv(user?.preparationPreferences?.priorityTopics),

    // Notification Preferences
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
    { id: "ai", label: "AI Coaching Style", icon: Sparkles },
    { id: "preparation", label: "Preparation Targets", icon: BookOpen },
    { id: "notifications", label: "Notifications", icon: Bell }
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Career Control Center</h1>
        <p className="text-text-secondary text-sm mt-1">Configure your career targets, Solo AI Interview persona, and learning preferences.</p>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-text-secondary hover:text-text hover:bg-bg-secondary"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* 1. CAREER PROFILE TAB */}
        {activeTab === "career" && (
          <div className="flex flex-col gap-6">
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
                    <h4 className="text-sm font-bold text-text mb-3">Education Background</h4>
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

            <Card className="shadow-sm border-border overflow-hidden">
              <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
                <div className="bg-info-bg border border-blue-200 p-1.5 rounded-md text-primary">
                  <Briefcase size={18} />
                </div>
                <CardTitle className="text-lg m-0">Target Roles & Preferences</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-6">
                
                {/* Target Roles */}
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
                      className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
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
                      className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
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
                    <label className="text-sm font-bold text-gray-700">Technical Skills (Canonicalized)</label>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2. INTERVIEW PREFERENCES TAB */}
        {activeTab === "interview" && (
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-purple-100 border border-purple-200 p-1.5 rounded-md text-purple-600">
                <Sliders size={18} />
              </div>
              <CardTitle className="text-lg m-0">Solo AI Interview Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Default Difficulty</label>
                  <select 
                    name="defaultDifficulty" 
                    onChange={updateField} 
                    value={form.defaultDifficulty}
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  >
                    <option value="easy">Easy (Intern / Entry)</option>
                    <option value="medium">Medium (Mid-level)</option>
                    <option value="hard">Hard (Senior / Lead)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Default Interview Type</label>
                  <select
                    name="defaultInterviewType"
                    onChange={updateField}
                    value={form.defaultInterviewType}
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  >
                    <option value="technical">Technical Focus</option>
                    <option value="hr">Behavioral (HR)</option>
                    <option value="project">Project Deep Dive</option>
                    <option value="mixed">Mixed Strategy</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Session Duration (Minutes)</label>
                  <select
                    name="durationMinutes"
                    onChange={updateField}
                    value={form.durationMinutes}
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  >
                    <option value={15}>15 Minutes (Quick Drill)</option>
                    <option value={30}>30 Minutes (Standard)</option>
                    <option value={45}>45 Minutes (Full Round)</option>
                    <option value={60}>60 Minutes (Marathon)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Evaluation Strictness</label>
                  <select
                    name="strictnessOfEvaluation"
                    onChange={updateField}
                    value={form.strictnessOfEvaluation}
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  >
                    <option value="gentle">Gentle & Supportive</option>
                    <option value="standard">Standard Industry Criteria</option>
                    <option value="strict">Strict Top-Tech Standard</option>
                  </select>
                </div>
              </div>

              <hr className="border-border" />

              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-bold text-text">Adaptive Behavioral Switches</h4>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-secondary/40">
                  <div>
                    <strong className="text-sm text-text block">Adaptive Questioning</strong>
                    <span className="text-xs text-text-secondary">Dynamically adjust follow-up difficulty based on candidate response quality.</span>
                  </div>
                  <input
                    type="checkbox"
                    name="adaptiveQuestioning"
                    checked={form.adaptiveQuestioning}
                    onChange={updateField}
                    className="h-5 w-5 accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-secondary/40">
                  <div>
                    <strong className="text-sm text-text block">Deep Follow-Up Questions</strong>
                    <span className="text-xs text-text-secondary">Allow interviewer to probe partially correct answers with clarification questions.</span>
                  </div>
                  <input
                    type="checkbox"
                    name="followUpQuestions"
                    checked={form.followUpQuestions}
                    onChange={updateField}
                    className="h-5 w-5 accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. AI PREFERENCES TAB */}
        {activeTab === "ai" && (
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-emerald-100 border border-emerald-200 p-1.5 rounded-md text-emerald-600">
                <BrainCircuit size={18} />
              </div>
              <CardTitle className="text-lg m-0">AI Persona & Coaching Style</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Coaching Style</label>
                  <select
                    name="coachingStyle"
                    onChange={updateField}
                    value={form.coachingStyle}
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  >
                    <option value="encouraging">Encouraging & Constructive</option>
                    <option value="rigorous">Rigorous & Analytical</option>
                    <option value="socratic">Socratic (Probing Questions)</option>
                    <option value="direct">Direct & Concise</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Response Detail Style</label>
                  <select
                    name="responseStyle"
                    onChange={updateField}
                    value={form.responseStyle}
                    className="w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  >
                    <option value="concise">Concise & Direct</option>
                    <option value="detailed">Detailed with Examples</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-secondary/40">
                <div>
                  <strong className="text-sm text-text block">Personalized Next Best Actions</strong>
                  <span className="text-xs text-text-secondary">Generate automated daily career recommendations based on identified skill gaps.</span>
                </div>
                <input
                  type="checkbox"
                  name="personalizedRecommendations"
                  checked={form.personalizedRecommendations}
                  onChange={updateField}
                  className="h-5 w-5 accent-primary cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. PREPARATION PREFERENCES TAB */}
        {activeTab === "preparation" && (
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-amber-100 border border-amber-200 p-1.5 rounded-md text-amber-600">
                <BookOpen size={18} />
              </div>
              <CardTitle className="text-lg m-0">Preparation & Learning Targets</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-700">Daily Preparation Target (Minutes)</label>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
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
                  className="w-full accent-primary"
                />
              </div>

              <Input
                label="Priority Preparation Topics (comma separated)"
                name="priorityTopics"
                value={form.priorityTopics}
                onChange={updateField}
                placeholder="e.g. System Design, React Performance, SQL Joins"
              />
            </CardContent>
          </Card>
        )}

        {/* 5. NOTIFICATION PREFERENCES TAB */}
        {activeTab === "notifications" && (
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-blue-100 border border-blue-200 p-1.5 rounded-md text-blue-600">
                <Bell size={18} />
              </div>
              <CardTitle className="text-lg m-0">Career Alerts & Reminders</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-secondary/40">
                <div>
                  <strong className="text-sm text-text block">Application Deadline Reminders</strong>
                  <span className="text-xs text-text-secondary">Get notified when tracked job applications approach follow-up dates.</span>
                </div>
                <input
                  type="checkbox"
                  name="applicationReminders"
                  checked={form.applicationReminders}
                  onChange={updateField}
                  className="h-5 w-5 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-secondary/40">
                <div>
                  <strong className="text-sm text-text block">Interview Session Reminders</strong>
                  <span className="text-xs text-text-secondary">Receive practice prompts before scheduled interview practice sessions.</span>
                </div>
                <input
                  type="checkbox"
                  name="interviewReminders"
                  checked={form.interviewReminders}
                  onChange={updateField}
                  className="h-5 w-5 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-secondary/40">
                <div>
                  <strong className="text-sm text-text block">Weekly Career Intelligence Summaries</strong>
                  <span className="text-xs text-text-secondary">Weekly breakdown of readiness progression, skill gap improvements, and target goals.</span>
                </div>
                <input
                  type="checkbox"
                  name="weeklySummaries"
                  checked={form.weeklySummaries}
                  onChange={updateField}
                  className="h-5 w-5 accent-primary cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* FEEDBACK MESSAGES */}
        {message && (
          <div className="bg-success-bg border border-success/20 text-success px-4 py-3 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
            <CheckCircle size={16} />
            {message}
          </div>
        )}
        {error && (
          <div className="bg-danger-bg border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm font-medium shadow-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" />
            {error}
          </div>
        )}

        {/* SAVE BUTTON */}
        <div className="flex justify-end mt-2">
          <Button type="submit" isLoading={saving} className="w-full sm:w-auto px-8 h-11 text-base">
            <Save size={18} className="mr-2" />
            Save Career Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
