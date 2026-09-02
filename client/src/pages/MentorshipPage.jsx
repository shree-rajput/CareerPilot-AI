import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  getMentors, 
  matchMentors, 
  bookSession, 
  getSessions, 
  onboardMentor, 
  respondToSession, 
  completeSession, 
  rateSession 
} from "../api/mentor";
import { toast } from "../context/ToastContext";
import api from "../api/axios";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { 
  Users, 
  UserCheck, 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Star, 
  BookOpen, 
  MessageSquare, 
  Video, 
  X,
  FileText,
  UserPlus
} from "lucide-react";

export function MentorshipPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("find"); // find, onboarding, sessions, dashboard
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Matching Mentors lists
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Student & Mentor Sessions
  const [studentSessions, setStudentSessions] = useState([]);
  const [mentorSessions, setMentorSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Onboarding Wizard Form State
  const [wizardStep, setWizardStep] = useState(1);
  const [onboardingForm, setOnboardingForm] = useState({
    role: "",
    company: "",
    experienceYears: 2,
    skills: "",
    specialties: "",
    availability: "Monday, Wednesday, Friday: 6 PM - 8 PM",
    bio: "",
    topics: "System Design, Resume Review, General Q&A"
  });
  const [submittingOnboard, setSubmittingOnboard] = useState(false);

  // Request Booking State
  const [bookingMentor, setBookingMentor] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    topic: "",
    description: "",
    duration: 30,
    scheduledAt: ""
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  // Reviewing/Completing States
  const [ratingSessionId, setRatingSessionId] = useState(null);
  const [ratingForm, setRatingForm] = useState({ rating: 5, review: "" });
  const [completingSessionId, setCompletingSessionId] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    mentorFeedback: "",
    rawNotes: "",
    actionItems: ""
  });
  const [completionLoading, setCompletionLoading] = useState(false);

  // Scheduling Response State
  const [schedulingSessionId, setSchedulingSessionId] = useState(null);
  const [meetingUrl, setMeetingUrl] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === "find") {
      fetchMatches();
    } else if (activeTab === "sessions") {
      fetchSessionsList();
    } else if (activeTab === "dashboard") {
      fetchMentorDashboardData();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      setCurrentUser(res.data.user);
      if (res.data.user.mentorStatus === "approved") {
        // Default to dashboard for approved mentors
        setActiveTab("dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load user credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      const res = await matchMentors();
      setMatches(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchSessionsList = async () => {
    try {
      setLoadingSessions(true);
      const res = await getSessions("student");
      setStudentSessions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchMentorDashboardData = async () => {
    try {
      setLoadingSessions(true);
      const res = await getSessions("mentor");
      setMentorSessions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Become a Mentor Submissions
  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingOnboard(true);
      setError("");
      const parsedData = {
        role: onboardingForm.role,
        company: onboardingForm.company,
        experienceYears: Number(onboardingForm.experienceYears),
        skills: onboardingForm.skills.split(",").map(s => s.trim()).filter(Boolean),
        specialties: onboardingForm.specialties.split(",").map(s => s.trim()).filter(Boolean),
        availability: onboardingForm.availability.split(",").map(a => a.trim()).filter(Boolean),
        bio: onboardingForm.bio,
        topics: onboardingForm.topics.split(",").map(t => t.trim()).filter(Boolean)
      };

      await onboardMentor(parsedData);
      
      // reload user status
      await fetchProfile();
      setActiveTab("onboarding");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to onboard as a mentor.");
    } finally {
      setSubmittingOnboard(false);
    }
  };

  // Booking a Session
  const handleBookSessionSubmit = async (e) => {
    e.preventDefault();
    if (!bookingMentor) return;
    try {
      setBookingLoading(true);
      await bookSession({
        mentorId: bookingMentor.mentorId || bookingMentor._id,
        topic: bookingForm.topic || bookingMentor.mentorProfile?.topics?.[0] || "General Q&A",
        description: bookingForm.description,
        duration: Number(bookingForm.duration),
        scheduledAt: bookingForm.scheduledAt
      });
      setBookingMentor(null);
      setBookingForm({ topic: "", description: "", duration: 30, scheduledAt: "" });
      toast.success("Mentorship session request submitted successfully!");
      setActiveTab("sessions");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit booking request.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Accepting slot request
  const handleAcceptRequest = async (sessionId) => {
    if (!meetingUrl) {
      setSchedulingSessionId(sessionId);
      return;
    }
    try {
      await respondToSession(sessionId, { status: "scheduled", meetingUrl });
      setSchedulingSessionId(null);
      setMeetingUrl("");
      fetchMentorDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Rejecting slot request
  const handleRejectRequest = async (sessionId) => {
    if (!window.confirm("Are you sure you want to decline this request?")) return;
    try {
      await respondToSession(sessionId, { status: "cancelled" });
      fetchMentorDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Submitting Session Completion & Action Sync
  const handleCompleteSession = async (e) => {
    e.preventDefault();
    if (!completingSessionId) return;
    try {
      setCompletionLoading(true);
      const items = completionForm.actionItems.split(",").map(i => i.trim()).filter(Boolean);
      await completeSession(completingSessionId, {
        mentorFeedback: completionForm.mentorFeedback,
        rawNotes: completionForm.rawNotes,
        actionItems: items
      });
      setCompletingSessionId(null);
      setCompletionForm({ mentorFeedback: "", rawNotes: "", actionItems: "" });
      fetchMentorDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setCompletionLoading(false);
    }
  };

  // Submitting Student Review Rating
  const handleRateSession = async (e) => {
    e.preventDefault();
    if (!ratingSessionId) return;
    try {
      await rateSession(ratingSessionId, ratingForm);
      setRatingSessionId(null);
      setRatingForm({ rating: 5, review: "" });
      fetchSessionsList();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-bg">
        <Spinner size="lg" className="text-primary" />
        <span className="text-xs font-semibold text-text-secondary mt-2">Entering Mentorship Center...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-bg animate-in fade-in">
      
      {/* PERSISTENT HEADER TABS */}
      <div className="bg-surface border-b border-border p-3.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-base font-extrabold text-text m-0 flex items-center gap-1.5">
            <Users size={18} className="text-primary" /> Mentorship Network
          </h1>
          <p className="text-[10px] text-text-secondary m-0 mt-0.5 font-semibold">Bridging human insights with AI mock briefings to accelerate placements.</p>
        </div>

        <div className="flex gap-1 bg-bg-secondary p-1 rounded-lg border border-border">
          <button 
            onClick={() => setActiveTab("find")}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors ${activeTab === "find" ? "bg-primary text-white" : "hover:bg-border text-text-secondary"}`}
          >
            Find a Mentor
          </button>
          
          <button 
            onClick={() => setActiveTab("sessions")}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors ${activeTab === "sessions" ? "bg-primary text-white" : "hover:bg-border text-text-secondary"}`}
          >
            My Bookings
          </button>

          {currentUser?.mentorStatus === "approved" ? (
            <Link to="/mentor/dashboard">
              <button 
                className="py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1 shadow-sm"
              >
                Mentor Portal →
              </button>
            </Link>
          ) : (
            <button 
              onClick={() => setActiveTab("onboarding")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors ${activeTab === "onboarding" ? "bg-primary text-white" : "hover:bg-border text-text-secondary"}`}
            >
              Become a Mentor
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* TAB 1: FIND A MENTOR */}
          {activeTab === "find" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={16} className="text-primary animate-pulse" /> AI-Ranked Recommendations
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5 font-semibold">Matched dynamically via target roles, industry tags, and skills gap weights.</p>
              </div>

              {loadingMatches ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Spinner size="md" className="text-primary" />
                  <span className="text-xs text-text-secondary mt-2 font-medium">Running match algorithms...</span>
                </div>
              ) : matches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.map((match) => (
                    <div 
                      key={match.mentorId || match._id} 
                      className={`bg-surface border rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${
                        match.matchScore >= 80 ? "border-primary/45 bg-primary/5" : "border-border"
                      }`}
                    >
                      {/* Recommendations highlights */}
                      {match.matchScore >= 80 && (
                        <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-lg">
                          Recommended Match
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-text m-0">{match.name}</h3>
                              {match.mentorProfile?.seedDemo && (
                                <span className="bg-warning/15 text-warning text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-warning/10">
                                  Demo Mentor
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-secondary m-0 mt-1 font-semibold">{match.mentorProfile?.role} @ {match.mentorProfile?.company}</p>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-primary leading-none">{match.matchScore}%</span>
                            <span className="text-[9px] font-bold text-text-secondary uppercase mt-0.5">Match Score</span>
                          </div>
                        </div>

                        {/* Specializations & Skills */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {match.mentorProfile?.skills?.slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="bg-bg-secondary text-[10px] font-bold text-text-secondary px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <p className="text-xs text-text-secondary mt-3 line-clamp-3 leading-relaxed font-medium">
                          {match.mentorProfile?.bio || "Expert software engineer helping candidates break into big tech."}
                        </p>

                        {/* Match Explanation block */}
                        {match.aiExplanation && (
                          <div className="bg-bg-secondary rounded-lg p-3 border border-border/40 mt-3 text-xs leading-relaxed text-text font-medium italic">
                            "{match.aiExplanation}"
                          </div>
                        )}
                      </div>

                      <div className="border-t border-border mt-4 pt-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                          <Star className="text-warning fill-warning" size={14} /> {match.mentorProfile?.rating || "4.8"} ({match.mentorProfile?.reviewsCount || 0} reviews)
                        </span>
                        
                        <Button 
                          variant="primary" 
                          size="xs" 
                          onClick={() => setBookingMentor(match)}
                          className="font-bold flex items-center gap-1"
                        >
                          <Calendar size={12} /> Book Session
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-surface border border-dashed border-border rounded-xl">
                  <AlertTriangle className="text-warning mx-auto mb-2" />
                  <p className="text-xs font-semibold text-text-secondary">No matching mentors available right now.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BECOME A MENTOR ONBOARDING FLOW */}
          {activeTab === "onboarding" && (
            <div className="max-w-2xl mx-auto bg-surface border border-border rounded-xl p-6 md:p-8 shadow-sm">
              {currentUser?.mentorStatus === "none" && (
                <form onSubmit={handleOnboardingSubmit} className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-sm font-black text-text uppercase tracking-wider flex items-center gap-2">
                      <UserPlus className="text-primary" size={18} /> Apply as a Career Pilot Mentor
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">Reviewing profiles checks industry credentials. Submitting seeds a demo profile instantly if seed parameters are activated.</p>
                  </div>

                  {/* Step Indicators */}
                  <div className="flex justify-between items-center border-y border-border py-3">
                    <span className={`text-xs font-bold ${wizardStep === 1 ? "text-primary" : "text-text-secondary"}`}>1. Professional Info</span>
                    <span className="text-text-secondary text-[10px] font-black">❯</span>
                    <span className={`text-xs font-bold ${wizardStep === 2 ? "text-primary" : "text-text-secondary"}`}>2. Specializations</span>
                    <span className="text-text-secondary text-[10px] font-black">❯</span>
                    <span className={`text-xs font-bold ${wizardStep === 3 ? "text-primary" : "text-text-secondary"}`}>3. Topics & Availability</span>
                  </div>

                  {wizardStep === 1 && (
                    <div className="flex flex-col gap-4 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-text">Job Title / Role</label>
                          <input 
                            type="text" 
                            required
                            className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none" 
                            placeholder="e.g. Senior Software Engineer"
                            value={onboardingForm.role}
                            onChange={(e) => setOnboardingForm({...onboardingForm, role: e.target.value})}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-text">Company</label>
                          <input 
                            type="text" 
                            required
                            className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none" 
                            placeholder="e.g. Google"
                            value={onboardingForm.company}
                            onChange={(e) => setOnboardingForm({...onboardingForm, company: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text">Years of Professional Experience</label>
                        <input 
                          type="number" 
                          min={1}
                          required
                          className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                          value={onboardingForm.experienceYears}
                          onChange={(e) => setOnboardingForm({...onboardingForm, experienceYears: Number(e.target.value)})}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text">Short Professional Bio</label>
                        <textarea 
                          required
                          rows={4}
                          className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none" 
                          placeholder="Introduce yourself, your journey, and how you want to support candidates..."
                          value={onboardingForm.bio}
                          onChange={(e) => setOnboardingForm({...onboardingForm, bio: e.target.value})}
                        />
                      </div>

                      <Button type="button" variant="primary" className="self-end" onClick={() => setWizardStep(2)}>
                        Next Step
                      </Button>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="flex flex-col gap-4 animate-in fade-in">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text">Technical Skills (Comma separated)</label>
                        <input 
                          type="text" 
                          required
                          className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none" 
                          placeholder="e.g. JavaScript, React, Node.js, AWS, Kubernetes"
                          value={onboardingForm.skills}
                          onChange={(e) => setOnboardingForm({...onboardingForm, skills: e.target.value})}
                        />
                        <span className="text-[10px] text-text-secondary font-medium">Helps candidates match based on technology stack criteria.</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text">Specializations / Areas of Expertise (Comma separated)</label>
                        <input 
                          type="text" 
                          required
                          className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none" 
                          placeholder="e.g. Backend Architecture, Front-End Infrastructure, Distributed Systems"
                          value={onboardingForm.specialties}
                          onChange={(e) => setOnboardingForm({...onboardingForm, specialties: e.target.value})}
                        />
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
                          Back
                        </Button>
                        <Button type="button" variant="primary" onClick={() => setWizardStep(3)}>
                          Next Step
                        </Button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="flex flex-col gap-4 animate-in fade-in">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text">Mentorship Topics (Comma separated)</label>
                        <input 
                          type="text" 
                          required
                          className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none" 
                          placeholder="e.g. Portfolio Review, Mock Interviews, Negotiation Advice"
                          value={onboardingForm.topics}
                          onChange={(e) => setOnboardingForm({...onboardingForm, topics: e.target.value})}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text">Availability Windows</label>
                        <input 
                          type="text" 
                          required
                          className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none" 
                          placeholder="e.g. Weekends: 10 AM - 2 PM, Tuesdays: 7 PM - 9 PM"
                          value={onboardingForm.availability}
                          onChange={(e) => setOnboardingForm({...onboardingForm, availability: e.target.value})}
                        />
                      </div>

                      {error && <div className="text-xs font-bold text-danger bg-danger-bg p-3 rounded-lg border border-danger/10">{error}</div>}

                      <div className="flex justify-between items-center mt-4">
                        <Button type="button" variant="outline" onClick={() => setWizardStep(2)}>
                          Back
                        </Button>
                        <Button type="submit" variant="primary" disabled={submittingOnboard}>
                          {submittingOnboard ? "Submitting..." : "Submit Application"}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {currentUser?.mentorStatus === "pending" && (
                <div className="text-center py-8 flex flex-col items-center gap-3">
                  <Clock className="text-warning" size={48} />
                  <h3 className="font-extrabold text-sm text-text uppercase tracking-wider">Application Under Review</h3>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
                    Our team is currently verifying your professional profile details. Once approved, you will have access to the Mentor Dashboard.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY BOOKINGS (As Student) */}
          {activeTab === "sessions" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={16} className="text-primary" /> Session Bookings
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">Keep track of upcoming slot discussions, past meetings, and action items.</p>
              </div>

              {loadingSessions ? (
                <div className="text-center p-12">
                  <Spinner size="md" />
                </div>
              ) : studentSessions.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {studentSessions.map((session) => (
                    <div key={session._id} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
                      
                      {/* Top Meta info */}
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-border">
                        <div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            session.status === "requested" ? "bg-warning/15 text-warning" :
                            session.status === "scheduled" ? "bg-success/15 text-success" :
                            session.status === "completed" ? "bg-primary/15 text-primary" : "bg-bg-secondary text-text-secondary"
                          }`}>
                            {session.status}
                          </span>
                          <h3 className="text-sm font-black text-text mt-2">{session.topic}</h3>
                          <span className="text-[10px] text-text-secondary font-semibold">Mentor: {session.mentorId?.name}</span>
                        </div>

                        <div className="text-right flex flex-col gap-1 text-[10px] font-semibold text-text-secondary">
                          <span className="flex items-center gap-1 justify-end"><Clock size={12} /> {session.duration} minutes</span>
                          <span>{new Date(session.scheduledAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Content block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-text-secondary">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-text">Session Goals</span>
                          <p className="text-text mt-1 font-medium">{session.description || "General career exploration session."}</p>
                        </div>

                        {session.meetingUrl && session.status === "scheduled" && (
                          <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 p-3 rounded-lg h-fit self-center">
                            <Video className="text-primary" size={18} />
                            <div>
                              <span className="text-[10px] font-bold text-primary block">Meeting URL</span>
                              <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-primary flex items-center gap-1 hover:underline">
                                Launch Video Link <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action items synced */}
                      {session.status === "completed" && session.postSessionSummary?.actionItems?.length > 0 && (
                        <div className="bg-bg-secondary rounded-lg p-3.5 border border-border">
                          <span className="text-[10px] font-bold text-text uppercase block mb-1">Mentor Action Items</span>
                          <ul className="list-disc pl-4 text-xs text-text-secondary flex flex-col gap-1">
                            {session.postSessionSummary.actionItems.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Feedback rating block */}
                      {session.status === "completed" && !session.studentReview?.rating && (
                        <div className="bg-primary/5 border border-primary/15 p-4 rounded-xl flex flex-col gap-3">
                          <div>
                            <span className="text-xs font-extrabold text-text block">Rate this session</span>
                            <span className="text-[10px] text-text-secondary">Share feedback about the mentorship experience.</span>
                          </div>
                          
                          {ratingSessionId === session._id ? (
                            <form onSubmit={handleRateSession} className="flex flex-col gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-text">Rating:</span>
                                <select 
                                  className="bg-bg border border-border text-xs font-bold text-text p-1 rounded"
                                  value={ratingForm.rating}
                                  onChange={(e) => setRatingForm({...ratingForm, rating: Number(e.target.value)})}
                                >
                                  <option value={5}>5 - Excellent</option>
                                  <option value={4}>4 - Very Good</option>
                                  <option value={3}>3 - Good</option>
                                  <option value={2}>2 - Fair</option>
                                  <option value={1}>1 - Poor</option>
                                </select>
                              </div>
                              <textarea 
                                rows={2}
                                required
                                className="bg-bg border border-border text-xs font-semibold text-text p-2 rounded outline-none"
                                placeholder="Write review..."
                                value={ratingForm.review}
                                onChange={(e) => setRatingForm({...ratingForm, review: e.target.value})}
                              />
                              <div className="flex gap-2">
                                <Button type="submit" size="xs">Submit Review</Button>
                                <Button type="button" variant="outline" size="xs" onClick={() => setRatingSessionId(null)}>Cancel</Button>
                              </div>
                            </form>
                          ) : (
                            <Button variant="outline" size="xs" className="w-fit" onClick={() => setRatingSessionId(session._id)}>
                              Leave Feedback
                            </Button>
                          )}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic text-center py-8">No session requests or history logged.</p>
              )}
            </div>
          )}

          {/* TAB 4: MENTOR DASHBOARD */}
          {activeTab === "dashboard" && currentUser?.mentorStatus === "approved" && (
            <div className="flex flex-col gap-6 animate-in fade-in">
              <div>
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={16} className="text-primary" /> Mentor Portal
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">Manage session bookings, log student summaries, and sync placement action items.</p>
              </div>

              {loadingSessions ? (
                <div className="text-center p-12">
                  <Spinner size="md" />
                </div>
              ) : mentorSessions.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {mentorSessions.map((session) => (
                    <div key={session._id} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
                      
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-border">
                        <div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            session.status === "requested" ? "bg-warning/15 text-warning" :
                            session.status === "scheduled" ? "bg-success/15 text-success" :
                            session.status === "completed" ? "bg-primary/15 text-primary" : "bg-bg-secondary text-text-secondary"
                          }`}>
                            {session.status}
                          </span>
                          <h3 className="text-sm font-black text-text mt-2">{session.topic}</h3>
                          <span className="text-[10px] text-text-secondary font-semibold">Candidate: {session.candidateId?.name}</span>
                        </div>

                        <div className="text-right flex flex-col gap-1 text-[10px] font-semibold text-text-secondary">
                          <span className="flex items-center gap-1 justify-end"><Clock size={12} /> {session.duration} mins</span>
                          <span>{new Date(session.scheduledAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* AI student pre-session brief */}
                      {session.status === "requested" && session.preSessionBrief && (
                        <div className="bg-primary/5 border border-primary/15 rounded-lg p-3.5 text-xs text-text leading-relaxed">
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase mb-1.5">
                            <Sparkles size={12} /> AI Prep Brief for Mentor
                          </span>
                          <div className="font-medium whitespace-pre-wrap">{session.preSessionBrief.backgroundSummary}</div>
                        </div>
                      )}

                      {/* Request actions */}
                      {session.status === "requested" && (
                        <div className="flex flex-col gap-3">
                          {schedulingSessionId === session._id ? (
                            <div className="flex flex-col gap-2 max-w-sm">
                              <label className="text-[10px] font-bold text-text-secondary uppercase">Video Link Meeting URL</label>
                              <input 
                                type="text"
                                className="bg-bg border border-border text-xs font-semibold text-text p-2 rounded outline-none"
                                placeholder="e.g. https://meet.google.com/abc-defg-hij"
                                value={meetingUrl}
                                onChange={(e) => setMeetingUrl(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button size="xs" onClick={() => handleAcceptRequest(session._id)}>Confirm Schedule</Button>
                                <Button size="xs" variant="outline" onClick={() => setSchedulingSessionId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="xs" onClick={() => handleAcceptRequest(session._id)}>Accept Request</Button>
                              <Button size="xs" variant="outline" onClick={() => handleRejectRequest(session._id)}>Decline</Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Complete scheduled session */}
                      {session.status === "scheduled" && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                            <Video size={16} /> Meeting URL: <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{session.meetingUrl}</a>
                          </div>

                          {completingSessionId === session._id ? (
                            <form onSubmit={handleCompleteSession} className="flex flex-col gap-4 mt-2 border-t border-border pt-4">
                              <h4 className="text-xs font-extrabold text-text uppercase">Log Session Feedback</h4>
                              
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-text">Direct Feedback to Candidate</label>
                                <textarea 
                                  rows={3}
                                  required
                                  className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none"
                                  placeholder="Provide summary of performance, confidence, strengths..."
                                  value={completionForm.mentorFeedback}
                                  onChange={(e) => setCompletionForm({...completionForm, mentorFeedback: e.target.value})}
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-text">Custom Action Items (Comma separated)</label>
                                <input 
                                  type="text"
                                  className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                                  placeholder="e.g. Solve 3 Binary Search questions, Tailor resume projects section"
                                  value={completionForm.actionItems}
                                  onChange={(e) => setCompletionForm({...completionForm, actionItems: e.target.value})}
                                />
                                <span className="text-[10px] text-text-secondary font-medium">These actions automatically sync into the student's Career Command Center.</span>
                              </div>

                              <div className="flex gap-2">
                                <Button type="submit" size="xs" disabled={completionLoading}>
                                  {completionLoading ? "Saving..." : "Submit Log"}
                                </Button>
                                <Button type="button" variant="outline" size="xs" onClick={() => setCompletingSessionId(null)}>Cancel</Button>
                              </div>
                            </form>
                          ) : (
                            <Button size="xs" className="w-fit" onClick={() => setCompletingSessionId(session._id)}>
                              Complete & Log Feedback
                            </Button>
                          )}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic text-center py-8">No candidate requests registered.</p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* REQUEST BOOKING MODAL */}
      {bookingMentor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface rounded-xl border border-border max-w-md w-full shadow-2xl p-6 relative flex flex-col gap-5">
            <button 
              onClick={() => setBookingMentor(null)}
              className="absolute top-4 right-4 hover:bg-bg-secondary p-1.5 rounded-lg text-text-secondary transition-colors"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="font-extrabold text-sm text-text m-0">Request Mentorship Slot</h3>
              <p className="text-[10px] text-text-secondary mt-0.5">Scheduling session with {bookingMentor.name}</p>
            </div>

            <form onSubmit={handleBookSessionSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text">Topic</label>
                <select 
                  className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg outline-none cursor-pointer"
                  required
                  value={bookingForm.topic}
                  onChange={(e) => setBookingForm({...bookingForm, topic: e.target.value})}
                >
                  <option value="">Select a topic...</option>
                  {bookingMentor.mentorProfile?.topics?.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text">Duration (minutes)</label>
                <select 
                  className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg outline-none cursor-pointer"
                  value={bookingForm.duration}
                  onChange={(e) => setBookingForm({...bookingForm, duration: Number(e.target.value)})}
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text">Proposed Date & Time</label>
                <input 
                  type="datetime-local"
                  required
                  className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg outline-none"
                  value={bookingForm.scheduledAt}
                  onChange={(e) => setBookingForm({...bookingForm, scheduledAt: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text">Goal / Session Details</label>
                <textarea 
                  rows={3}
                  required
                  className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg outline-none resize-none"
                  placeholder="What would you like assistance with during this session?"
                  value={bookingForm.description}
                  onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})}
                />
              </div>

              <Button type="submit" variant="primary" disabled={bookingLoading} className="mt-2">
                {bookingLoading ? "Requesting..." : "Submit Booking Request"}
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
