import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  FileCode,
  Briefcase,
  Users
} from "lucide-react";
import { api } from "../../api/axios";

export function MentorOnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Step 2 & 3 Form Fields
  const [formData, setFormData] = useState({
    professionalName: "",
    headline: "",
    currentRole: "",
    company: "",
    experienceYears: 3,
    skills: "React, Node.js, System Design",
    expertiseAreas: "Software Engineering, Frontend, System Design",
    mentoringTopics: "Resume Review, Mock Interview, System Architecture",
    languages: "English",
    bio: "",
    portfolioUrl: "",
    githubUrl: "",
    linkedinUrl: "",
    track: "technical"
  });

  // Step 5 Assessment Challenge State
  const [challenge, setChallenge] = useState(null);
  const [submission, setSubmission] = useState("");
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [assessing, setAssessing] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, [formData.track]);

  const fetchChallenge = async () => {
    try {
      const res = await api.get(`/mentors/assessment/challenge?track=${formData.track}`);
      if (res.data?.success) {
        setChallenge(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch capability challenge:", err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = async () => {
    setError("");
    if (currentStep === 2) {
      if (!formData.professionalName || !formData.headline || !formData.currentRole || !formData.company) {
        setError("Please complete all required professional profile fields.");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAssessmentSubmit = async () => {
    if (!submission || submission.trim().length < 50) {
      setError("Please provide a detailed challenge submission (at least 50 characters).");
      return;
    }
    setAssessing(true);
    setError("");
    try {
      // First submit application profile
      await api.post("/mentors/apply", {
        ...formData,
        skills: formData.skills.split(",").map((s) => s.trim()),
        expertiseAreas: formData.expertiseAreas.split(",").map((s) => s.trim()),
        mentoringTopics: formData.mentoringTopics.split(",").map((s) => s.trim()),
        languages: formData.languages.split(",").map((s) => s.trim())
      });

      // Submit capability assessment
      const res = await api.post("/mentors/assessment/submit", {
        track: formData.track,
        challengeId: challenge?.challengeId || "tech_01_explain_concept",
        submissionContent: submission
      });

      if (res.data?.success) {
        setAssessmentResult(res.data.data);
        setSuccessMsg(res.data.message);
        setCurrentStep(6); // Move to Code of Conduct
      }
    } catch (err) {
      setError(err.response?.data?.message || "Assessment evaluation failed. Please try again.");
    } finally {
      setAssessing(false);
    }
  };

  const handleCompleteOnboarding = () => {
    navigate("/mentor/dashboard");
  };

  const steps = [
    { num: 1, title: "Account Verification", desc: "Verify email & identity" },
    { num: 2, title: "Professional Profile", desc: "Role, company & bio" },
    { num: 3, title: "Expertise & Skills", desc: "Focus topics & experience" },
    { num: 4, title: "Mentoring Preferences", desc: "Track selection & rules" },
    { num: 5, title: "Capability Assessment", desc: "Practical mentoring challenge" },
    { num: 6, title: "Code of Conduct", desc: "Platform safety rules" },
    { num: 7, title: "Probation State", desc: "Access limited mentoring" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-3 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" /> Mentor Onboarding Program
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Join CareerPilot Mentor Ecosystem
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Earn trust progressively through evidence, practical capability demonstration, and real student impact.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-8">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                currentStep === s.num
                  ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                  : currentStep > s.num
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 font-semibold">
                {currentStep > s.num ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span>Step {s.num}</span>}
              </div>
              <div className="truncate text-slate-300">{s.title}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Content Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
          {/* STEP 1: ACCOUNT VERIFICATION */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 1: Identity & Account Verification</h2>
                  <p className="text-xs text-slate-400">Verifying that your account email and basic identity signals match platform standards.</p>
                </div>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Email Address Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Account Verified
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Role Selection:</span>
                  <span className="text-indigo-300 font-semibold">Applicant Mentor</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                CareerPilot AI never sells or publicly displays your private contact details. All mentors start in a verified probationary state after passing capability assessment.
              </p>

              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                Proceed to Professional Profile <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PROFESSIONAL PROFILE */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 2: Professional Profile</h2>
                  <p className="text-xs text-slate-400">Share your current industry role and background.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Professional Name *</label>
                  <input
                    type="text"
                    name="professionalName"
                    value={formData.professionalName}
                    onChange={handleInputChange}
                    placeholder="e.g. Sarah Chen"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Headline *</label>
                  <input
                    type="text"
                    name="headline"
                    value={formData.headline}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Staff Engineer @ TechCorp | DSA Mentor"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current Role *</label>
                  <input
                    type="text"
                    name="currentRole"
                    value={formData.currentRole}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Backend Engineer"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current Company *</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="e.g. Google / Stripe / Startup"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Years of Industry Experience</label>
                <input
                  type="number"
                  name="experienceYears"
                  min="0"
                  max="50"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bio / Mentoring Approach</label>
                <textarea
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Share a brief overview of how you help students succeed in technical interviews and career growth."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrevStep}
                  className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                >
                  Next: Expertise & Skills <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: EXPERTISE & SKILLS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <BookOpen className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 3: Expertise & Topics</h2>
                  <p className="text-xs text-slate-400">Select topics you can confidently mentor students in.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Technical Skills (comma separated)</label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expertise Areas</label>
                <input
                  type="text"
                  name="expertiseAreas"
                  value={formData.expertiseAreas}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mentoring Session Topics</label>
                <input
                  type="text"
                  name="mentoringTopics"
                  value={formData.mentoringTopics}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={handlePrevStep} className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm">Back</button>
                <button onClick={handleNextStep} className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                  Next: Track & Preferences <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: MENTORING PREFERENCES */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Users className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 4: Select Assessment Track</h2>
                  <p className="text-xs text-slate-400">Choose the track for your practical capability challenge.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "technical", title: "Technical Mentor", desc: "Explain concepts, code review, identify bugs" },
                  { id: "career", title: "Career Mentor", desc: "Resume reviews, career roadmaps, guidance" },
                  { id: "interview", title: "Interview Mentor", desc: "Conduct mock interviews & evaluate candidate answers" }
                ].map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setFormData({ ...formData, track: t.id })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.track === t.id
                        ? "bg-indigo-600/20 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">{t.title}</div>
                    <div className="text-xs text-slate-400">{t.desc}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={handlePrevStep} className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm">Back</button>
                <button onClick={handleNextStep} className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                  Take Capability Assessment <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: CAPABILITY ASSESSMENT CHALLENGE */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <FileCode className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 5: Practical Capability Assessment</h2>
                  <p className="text-xs text-slate-400">Demonstrate your teaching and mentoring effectiveness.</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-2">
                  <Award className="w-4 h-4" /> {challenge?.title || "Explain Async/Await to a Beginner"}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {challenge?.scenarioPrompt || "A junior student is confused about asynchronous JavaScript, Promises, and the Event Loop. Write a clear, practical response explaining how async/await works under the hood."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Your Response / Mentoring Demonstration * (min 50 chars)
                </label>
                <textarea
                  rows={6}
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Type your explanation, code example, or feedback notes here..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={handlePrevStep} className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm">Back</button>
                <button
                  onClick={handleAssessmentSubmit}
                  disabled={assessing}
                  className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                >
                  {assessing ? <Zap className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  {assessing ? "Evaluating Rubric..." : "Submit & Evaluate Challenge"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: CODE OF CONDUCT */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 6: Mentor Code of Conduct & Platform Rules</h2>
                  <p className="text-xs text-slate-400">Review guidelines for respectful, constructive mentorship.</p>
                </div>
              </div>

              {assessmentResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-300">
                  <div className="font-semibold text-sm mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Rubric Score: {assessmentResult.overallScore}/100 - PASSED
                  </div>
                  <span>Your capability challenge met the platform threshold. Proceeding to probation.</span>
                </div>
              )}

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 space-y-2">
                <p>1. <strong>Respect & Inclusivity</strong>: Maintain professional, anti-bias communication at all times.</p>
                <p>2. <strong>Constructive Feedback</strong>: Provide actionable, encouraging guidance to help candidates improve.</p>
                <p>3. <strong>Punctuality & Reliability</strong>: Honor scheduled sessions. Give 24-hour advance notice for rescheduling.</p>
                <p>4. <strong>Platform Integrity</strong>: Keep all mentorship communications and transactions on CareerPilot AI.</p>
              </div>

              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
              >
                I Agree & Accept Guidelines <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 7: PROBATION STATE & DASHBOARD LAUNCH */}
          {currentStep === 7 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-white">Welcome to Probationary Mentor Status!</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You have completed onboarding and capability assessment. As a Probationary Mentor, you have access to:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <div className="font-semibold text-indigo-400 mb-1">Max 5 Sessions / Week</div>
                  <div className="text-slate-400">Protects initial capacity during probation.</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <div className="font-semibold text-indigo-400 mb-1">Real Mentoring Access</div>
                  <div className="text-slate-400">Accept student booking requests and conduct live sessions.</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <div className="font-semibold text-indigo-400 mb-1">Earn Progressive Trust</div>
                  <div className="text-slate-400">Complete 5 sessions with 4.5+ rating to unlock Verified Mentor status.</div>
                </div>
              </div>

              <button
                onClick={handleCompleteOnboarding}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
              >
                Go to Mentor Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
