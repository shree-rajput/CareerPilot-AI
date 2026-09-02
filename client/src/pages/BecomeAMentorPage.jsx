import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Users, ShieldCheck, Sparkles, CheckCircle2, Award, Clock, ArrowRight, Video, FileText, ChevronRight, AlertCircle
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { onboardMentor } from "../api/mentor";
import { toast } from "../context/ToastContext";

export function BecomeAMentorPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    role: "",
    company: "",
    experienceYears: 3,
    skills: "",
    specialties: "",
    availability: "Monday & Wednesday: 6 PM - 8 PM EST",
    bio: "",
    topics: "System Design, Mock Technical Interview, Resume Review",
    linkedinUrl: "",
    githubUrl: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const parsed = {
        role: form.role,
        company: form.company,
        experienceYears: Number(form.experienceYears),
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        specialties: form.specialties.split(",").map(s => s.trim()).filter(Boolean),
        availability: form.availability.split(",").map(a => a.trim()).filter(Boolean),
        bio: form.bio,
        topics: form.topics.split(",").map(t => t.trim()).filter(Boolean),
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl
      };

      await onboardMentor(parsed);
      toast.success("Mentor application submitted successfully! Your profile is pending verification.");
      navigate("/mentor/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit mentor application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-y-auto custom-scrollbar pb-16 animate-in fade-in">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-primary/10 via-bg to-bg border-b border-border p-8 md:p-12 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
            <Sparkles size={14} /> Empower The Next Generation
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-text tracking-tight m-0">
            Become a CareerPilot <span className="text-primary">Verified Mentor</span>
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-xl leading-relaxed">
            Share your real-world engineering experience with ambitious candidates. Conduct 1:1 sessions backed by AI student prep briefs.
          </p>
          <div className="flex gap-3 mt-2">
            <a href="#apply-wizard">
              <Button size="md" variant="primary" className="font-extrabold gap-2">
                Apply as Mentor <ArrowRight size={16} />
              </Button>
            </a>
            <Link to="/mentorship">
              <Button size="md" variant="outline" className="font-bold">
                Student Network View
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Value Proposition Cards */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-border bg-surface flex flex-col gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit">
            <Sparkles size={24} />
          </div>
          <h3 className="font-extrabold text-base text-text m-0">AI Candidate Briefs</h3>
          <p className="text-xs text-text-secondary leading-relaxed m-0">
            Never enter a session cold. CareerPilot generates a concise summary of the student's target role, strengths, and exact skill gaps before every meeting.
          </p>
        </Card>

        <Card className="p-6 border-border bg-surface flex flex-col gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 w-fit">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-extrabold text-base text-text m-0">Verified Professional Badge</h3>
          <p className="text-xs text-text-secondary leading-relaxed m-0">
            Build trust. Approved mentors display a <span className="text-primary font-bold">✓ CareerPilot Verified Mentor</span> badge that highlights verified industry credentials.
          </p>
        </Card>

        <Card className="p-6 border-border bg-surface flex flex-col gap-3">
          <div className="p-3 bg-success/10 rounded-xl text-success w-fit">
            <Video size={24} />
          </div>
          <h3 className="font-extrabold text-base text-text m-0">Integrated Video & Notes</h3>
          <p className="text-xs text-text-secondary leading-relaxed m-0">
            Host sessions directly inside CareerPilot with real-time video, audio, screen share, and session notes that sync directly to candidate action plans.
          </p>
        </Card>
      </div>

      {/* Onboarding Wizard Section */}
      <div id="apply-wizard" className="max-w-3xl mx-auto px-6 py-8 w-full">
        <Card className="p-8 border-border bg-surface shadow-md flex flex-col gap-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-black text-text m-0 flex items-center gap-2">
              <Award className="text-primary" size={20} /> Mentor Application Wizard
            </h2>
            <p className="text-xs text-text-secondary mt-1 m-0">
              Provide your professional background. Once submitted, your profile enters verification review.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger-bg border border-danger/20 text-danger text-xs font-bold rounded-lg">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Step Indicators */}
            <div className="flex justify-between items-center bg-bg p-3 rounded-xl border border-border">
              <span className={`text-xs font-extrabold ${step === 1 ? "text-primary" : "text-text-secondary"}`}>
                1. Role & Experience
              </span>
              <ChevronRight size={14} className="text-text-secondary" />
              <span className={`text-xs font-extrabold ${step === 2 ? "text-primary" : "text-text-secondary"}`}>
                2. Expertise & Topics
              </span>
              <ChevronRight size={14} className="text-text-secondary" />
              <span className={`text-xs font-extrabold ${step === 3 ? "text-primary" : "text-text-secondary"}`}>
                3. Links & Availability
              </span>
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text">Current Professional Role</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Staff Software Engineer"
                      className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                      value={form.role}
                      onChange={(e) => setForm({...form, role: e.target.value})}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text">Company</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Google / Microsoft / Stripe"
                      className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                      value={form.company}
                      onChange={(e) => setForm({...form, company: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Years of Engineering Experience</label>
                  <input 
                    type="number"
                    min={1}
                    max={40}
                    required
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={form.experienceYears}
                    onChange={(e) => setForm({...form, experienceYears: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Short Professional Bio</label>
                  <textarea 
                    rows={4}
                    required
                    placeholder="Tell candidates about your background, career trajectory, and how you mentor..."
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none"
                    value={form.bio}
                    onChange={(e) => setForm({...form, bio: e.target.value})}
                  />
                </div>

                <Button type="button" variant="primary" className="self-end font-bold" onClick={() => setStep(2)}>
                  Next Step <ChevronRight size={14} />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4 animate-in fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Primary Technical Skills (Comma separated)</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. React, Node.js, System Design, Distributed Systems, Python"
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={form.skills}
                    onChange={(e) => setForm({...form, skills: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Specializations / Focus Areas (Comma separated)</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Frontend Architecture, Backend Infrastructure, High-Throughput APIs"
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={form.specialties}
                    onChange={(e) => setForm({...form, specialties: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Mentorship Topics Offered (Comma separated)</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. System Design Mock, Resume Review, Salary Negotiation"
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={form.topics}
                    onChange={(e) => setForm({...form, topics: e.target.value})}
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="button" variant="primary" className="font-bold" onClick={() => setStep(3)}>
                    Next Step <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4 animate-in fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">LinkedIn Profile URL</label>
                  <input 
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={form.linkedinUrl}
                    onChange={(e) => setForm({...form, linkedinUrl: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">GitHub Profile URL (Optional)</label>
                  <input 
                    type="url"
                    placeholder="https://github.com/yourusername"
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={form.githubUrl}
                    onChange={(e) => setForm({...form, githubUrl: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">General Availability Slots</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Tuesdays & Thursdays: 7 PM - 9 PM EST"
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={form.availability}
                    onChange={(e) => setForm({...form, availability: e.target.value})}
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting} className="font-extrabold gap-2">
                    {submitting ? "Submitting Application..." : "Submit Application 🚀"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
