import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  discoverMentors, 
  getSessions, 
  respondToSession, 
  completeSession, 
  rateSession 
} from "../api/mentor";
import { toast } from "../context/ToastContext";
import api from "../api/axios";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { MentorshipBookingModal } from "../components/mentor/MentorshipBookingModal";
import { MentorReviewModal } from "../components/mentor/MentorReviewModal";
import { ReportMentorModal } from "../components/mentor/ReportMentorModal";
import { 
  Users, 
  UserCheck, 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Star, 
  BookOpen, 
  MessageSquare, 
  Video, 
  X,
  FileText,
  UserPlus,
  Briefcase,
  Award,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ExternalLink
} from "lucide-react";

export function MentorshipPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("find"); // find, onboarding, sessions

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Discovery
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [includeDemo, setIncludeDemo] = useState(true);
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);

  // Student Sessions
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Modals
  const [bookingMentor, setBookingMentor] = useState(null);
  const [reviewSession, setReviewSession] = useState(null);
  const [reportingMentor, setReportingMentor] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === "find") {
      fetchMentorList();
    } else if (activeTab === "sessions") {
      fetchStudentSessions();
    }
  }, [activeTab, searchQuery, specialtyFilter, roleFilter, includeDemo]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      const u = res.data.user || res.data;
      setCurrentUser(u);
    } catch (err) {
      console.error(err);
      setError("Failed to load user credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorList = async () => {
    try {
      setLoadingMentors(true);
      const params = {
        includeDemo: includeDemo ? "true" : "false"
      };
      if (searchQuery) params.query = searchQuery;
      if (specialtyFilter) params.specialty = specialtyFilter;
      if (roleFilter) params.role = roleFilter;

      const res = await discoverMentors(params);
      setMentors(res.data || []);
    } catch (err) {
      console.error(err);
    } fontually: {
      setLoadingMentors(false);
    }
  };

  const fetchStudentSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await getSessions("student");
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-bg">
        <Spinner size="lg" className="text-primary" />
        <span className="text-xs font-semibold text-text-secondary mt-2">Connecting to Mentor Network...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-bg animate-in fade-in">
      
      {/* PERSISTENT HEADER TABS */}
      <div className="bg-surface border-b border-border p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-base font-extrabold text-text m-0 flex items-center gap-2">
            <Users size={18} className="text-primary" /> Mentor Connect
          </h1>
          <p className="text-[11px] text-text-secondary m-0 mt-0.5 font-semibold">
            Trusted mentor ecosystem with real-time WebRTC sessions & AI prep briefs.
          </p>
        </div>

        <div className="flex gap-1 bg-bg-secondary p-1 rounded-xl border border-border">
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

          {currentUser?.role === "admin" && (
            <Link to="/admin/mentors">
              <button className="py-1.5 px-3 rounded-lg text-xs font-bold text-center bg-danger/15 text-danger hover:bg-danger/20 transition-colors border border-danger/30">
                Admin Moderation
              </button>
            </Link>
          )}

          {currentUser?.mentorStatus === "approved" || currentUser?.role === "mentor" ? (
            <Link to="/mentor/dashboard">
              <button className="py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1 shadow-sm">
                Mentor Portal →
              </button>
            </Link>
          ) : (
            <Link to="/become-a-mentor">
              <button className="py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors hover:bg-border text-text-secondary">
                Become a Mentor
              </button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* TAB 1: FIND A MENTOR */}
          {activeTab === "find" && (
            <div className="flex flex-col gap-6">
              
              {/* Search & Filter Toolbar */}
              <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="relative w-full md:w-80">
                  <Search size={14} className="absolute left-3 top-3 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search by name, company, skill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-bg border border-border text-xs font-semibold text-text pl-9 pr-3 py-2 rounded-xl focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                  <select
                    value={specialtyFilter}
                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                    className="bg-bg border border-border text-xs font-bold text-text p-2 rounded-xl outline-none"
                  >
                    <option value="">All Specialties</option>
                    <option value="System Design">System Design</option>
                    <option value="Frontend Architecture">Frontend Architecture</option>
                    <option value="Backend Infrastructure">Backend Infrastructure</option>
                    <option value="Distributed Systems">Distributed Systems</option>
                    <option value="Resume Review">Resume Review</option>
                  </select>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-bg border border-border text-xs font-bold text-text p-2 rounded-xl outline-none"
                  >
                    <option value="">All Roles</option>
                    <option value="Senior Software Engineer">Senior Engineer</option>
                    <option value="Staff Software Engineer">Staff Engineer</option>
                    <option value="Engineering Manager">Engineering Manager</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-xs font-bold text-text-secondary bg-bg px-3 py-2 rounded-xl border border-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDemo}
                      onChange={(e) => setIncludeDemo(e.target.checked)}
                      className="rounded"
                    />
                    Include Seed Demos
                  </label>
                </div>
              </div>

              {/* Mentor List Grid */}
              {loadingMentors ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Spinner size="md" className="text-primary" />
                  <span className="text-xs text-text-secondary mt-2 font-medium">Matching mentors...</span>
                </div>
              ) : mentors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mentors.map((item) => {
                    const mentor = item.mentorProfile || item;
                    const ver = item.verification || mentor.verificationId || {};
                    const matchScore = item.matchScore || 85;

                    return (
                      <div 
                        key={item.mentorId || item._id} 
                        className={`bg-surface border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${
                          matchScore >= 80 ? "border-primary/40 bg-primary/5" : "border-border"
                        }`}
                      >
                        {matchScore >= 80 && (
                          <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">
                            {matchScore}% Match
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center font-black text-primary text-base shrink-0">
                                {item.name?.slice(0, 2)?.toUpperCase() || "M"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link 
                                    to={`/mentorship/profile/${item.mentorId || item._id}`}
                                    className="font-black text-base text-text hover:text-primary transition-colors m-0"
                                  >
                                    {item.name}
                                  </Link>
                                  {mentor.isDemo && (
                                    <span className="bg-warning/15 text-warning text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-warning/10">
                                      Demo
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-text-secondary m-0 mt-0.5 font-bold">
                                  {mentor.role} @ <span className="text-primary">{mentor.company}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Granular Verification Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {ver.identityStatus === "verified" && (
                              <span className="bg-success/10 text-success text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-success/20 flex items-center gap-1">
                                <CheckCircle2 size={10} /> Identity
                              </span>
                            )}
                            {ver.employmentStatus === "verified" && (
                              <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                                <Briefcase size={10} /> Employment
                              </span>
                            )}
                            {ver.expertiseStatus === "verified" && (
                              <span className="bg-purple-500/10 text-purple-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
                                <Award size={10} /> Expertise
                              </span>
                            )}
                          </div>

                          {/* Skills */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {mentor.skills?.slice(0, 4).map((skill, idx) => (
                              <span key={idx} className="bg-bg text-[10px] font-bold text-text-secondary px-2 py-0.5 rounded border border-border">
                                {skill}
                              </span>
                            ))}
                          </div>

                          <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed font-medium">
                            {mentor.bio || "Senior engineer guiding candidates on technical system design and career growth."}
                          </p>

                          {/* Match Explanation */}
                          {item.aiExplanation && (
                            <div className="bg-bg rounded-xl p-3 border border-border mt-3 text-xs leading-relaxed text-text italic">
                              "{item.aiExplanation}"
                            </div>
                          )}
                        </div>

                        <div className="border-t border-border mt-4 pt-3 flex justify-between items-center">
                          <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                            <Star className="text-warning fill-warning" size={14} /> {mentor.rating || "4.8"} ({mentor.completedSessionsCount || 0} sessions)
                          </span>

                          <div className="flex gap-2">
                            <Link to={`/mentorship/profile/${item.mentorId || item._id}`}>
                              <Button variant="outline" size="xs" className="font-bold">
                                View Profile
                              </Button>
                            </Link>
                            <Button 
                              variant="primary" 
                              size="xs" 
                              onClick={() => setBookingMentor(item)}
                              className="font-extrabold flex items-center gap-1"
                            >
                              <Calendar size={12} /> Book Session
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-12 bg-surface border border-dashed border-border rounded-2xl">
                  <AlertTriangle className="text-warning mx-auto mb-2" />
                  <p className="text-xs font-semibold text-text-secondary">No mentors match your search criteria.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SESSIONS (BOOKINGS) */}
          {activeTab === "sessions" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={16} className="text-primary" /> Session History & Upcoming Meetings
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">Access live WebRTC rooms, view mentor feedback, and complete reviews.</p>
              </div>

              {loadingSessions ? (
                <div className="text-center p-12">
                  <Spinner size="md" />
                </div>
              ) : sessions.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {sessions.map((session) => (
                    <div key={session._id} className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-border">
                        <div>
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            session.status === "requested" ? "bg-warning/15 text-warning" :
                            session.status === "scheduled" ? "bg-success/15 text-success" :
                            session.status === "completed" ? "bg-primary/15 text-primary" : "bg-bg-secondary text-text-secondary"
                          }`}>
                            {session.status}
                          </span>
                          <h3 className="text-sm font-black text-text mt-2 m-0">{session.topic}</h3>
                          <span className="text-[11px] text-text-secondary font-semibold">Mentor: {session.mentorId?.name || "Mentor"}</span>
                        </div>

                        <div className="text-right flex flex-col gap-1 text-[10px] font-bold text-text-secondary">
                          <span className="flex items-center gap-1 justify-end"><Clock size={12} /> {session.duration} mins</span>
                          <span>{new Date(session.scheduledAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-text-secondary">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-text">Session Goals</span>
                          <p className="text-text mt-1 font-medium m-0">{session.description || "1:1 Career exploration session."}</p>
                        </div>

                        {session.status === "scheduled" && (
                          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-xl">
                            <div className="flex items-center gap-2">
                              <Video className="text-primary" size={20} />
                              <div>
                                <span className="text-[10px] font-bold text-primary block">LiveKit Video Room</span>
                                <span className="text-xs font-black text-text">Ready to join</span>
                              </div>
                            </div>
                            <Link to={`/mentor/session/${session._id}`}>
                              <Button size="xs" variant="primary" className="font-extrabold gap-1">
                                Enter Room 🚀
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Mentor Feedback & Action Items */}
                      {session.status === "completed" && session.mentorFeedback && (
                        <div className="bg-bg p-4 rounded-xl border border-border flex flex-col gap-2">
                          <span className="text-[10px] font-extrabold text-primary uppercase">Mentor Feedback</span>
                          <p className="text-xs text-text font-medium m-0">{session.mentorFeedback}</p>
                          
                          {session.postSessionSummary?.actionItems?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Action Items</span>
                              <ul className="list-disc pl-4 text-xs text-text-secondary flex flex-col gap-1 m-0">
                                {session.postSessionSummary.actionItems.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Review & Safety Actions */}
                      <div className="flex justify-between items-center border-t border-border pt-3">
                        <button
                          onClick={() => setReportingMentor({ mentorId: session.mentorId?._id || session.mentorId, name: session.mentorId?.name, sessionId: session._id })}
                          className="text-[11px] font-bold text-danger hover:underline flex items-center gap-1"
                        >
                          <ShieldAlert size={12} /> Report Issue
                        </button>

                        {session.status === "completed" && !session.studentReview?.rating && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setReviewSession(session)}
                            className="font-bold gap-1"
                          >
                            <Star size={12} className="text-warning fill-warning" /> Leave Review
                          </Button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic text-center py-12 bg-surface border border-dashed border-border rounded-2xl">
                  No session bookings registered yet.
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {bookingMentor && (
        <MentorshipBookingModal
          mentor={bookingMentor.mentorProfile ? { ...bookingMentor.mentorProfile, name: bookingMentor.name, _id: bookingMentor.mentorId } : bookingMentor}
          onClose={() => setBookingMentor(null)}
          onSuccess={() => {
            setActiveTab("sessions");
            fetchStudentSessions();
          }}
        />
      )}

      {reviewSession && (
        <MentorReviewModal
          sessionId={reviewSession._id}
          mentorName={reviewSession.mentorId?.name}
          onClose={() => setReviewSession(null)}
          onSuccess={fetchStudentSessions}
        />
      )}

      {reportingMentor && (
        <ReportMentorModal
          mentorId={reportingMentor.mentorId}
          mentorName={reportingMentor.name}
          sessionId={reportingMentor.sessionId}
          onClose={() => setReportingMentor(null)}
        />
      )}

    </div>
  );
}
