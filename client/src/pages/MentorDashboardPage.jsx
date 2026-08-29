import React, { useState, useEffect } from "react";
import { 
  GraduationCap, Clock, CheckCircle2, XCircle, AlertCircle, 
  User, Calendar, Sparkles, Send, ShieldCheck, RefreshCw, ChevronRight, FileText
} from "lucide-react";
import { 
  getMyProfile, 
  getSessions, 
  respondToSession, 
  completeSession 
} from "../api/mentor";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { Link } from "react-router-dom";

export function MentorDashboardPage() {
  const [mentorProfile, setMentorProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Availability editing state
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState({
    timezone: "UTC",
    weeklySlots: [
      { day: "Monday", startTime: "17:00", endTime: "20:00" },
      { day: "Wednesday", startTime: "17:00", endTime: "20:00" },
      { day: "Saturday", startTime: "10:00", endTime: "16:00" }
    ]
  });

  // Session completion modal state
  const [completingSessionId, setCompletingSessionId] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    mentorFeedback: "",
    actionItems: ""
  });
  const [completionLoading, setCompletionLoading] = useState(false);

  useEffect(() => {
    loadMentorData();
  }, []);

  async function loadMentorData() {
    setLoading(true);
    setError("");
    try {
      const [profileRes, requestsRes] = await Promise.allSettled([
        getMyProfile(),
        getSessions("mentor")
      ]);

      if (profileRes.status === "fulfilled") {
        const userData = profileRes.value?.user || profileRes.value?.data || profileRes.value;
        setMentorProfile(userData);
        if (userData?.mentorProfile?.availability) {
          setAvailabilityForm({
            timezone: userData.mentorProfile.availability.timezone || "UTC",
            weeklySlots: userData.mentorProfile.availability.weeklySlots || []
          });
        }
      }

      if (requestsRes.status === "fulfilled") {
        const reqData = requestsRes.value?.data || requestsRes.value;
        setRequests(Array.isArray(reqData) ? reqData : []);
      }
    } catch (err) {
      console.error("Failed to load mentor dashboard data", err);
      setError("Failed to load mentor dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRequestStatus(sessionId, status) {
    setActionLoading(sessionId);
    try {
      await respondToSession(sessionId, { status });
      await loadMentorData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update session status.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdateAvailability(e) {
    e.preventDefault();
    setActionLoading("availability");
    try {
      alert("Availability schedule updated successfully!");
      setEditingAvailability(false);
      await loadMentorData();
    } catch (err) {
      alert("Failed to update availability.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCompleteSession(e) {
    e.preventDefault();
    if (!completingSessionId) return;
    setCompletionLoading(true);
    try {
      const itemsArray = completionForm.actionItems
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await completeSession(completingSessionId, {
        mentorFeedback: completionForm.mentorFeedback,
        actionItems: itemsArray
      });

      alert("Session feedback logged & action items synced to candidate!");
      setCompletingSessionId(null);
      setCompletionForm({ mentorFeedback: "", actionItems: "" });
      await loadMentorData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to complete session.");
    } finally {
      setCompletionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isApprovedMentor = mentorProfile?.mentorStatus === "approved";

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-500/10 via-primary/5 to-transparent p-6 rounded-2xl border border-purple-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Dedicated Mentor Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-text m-0">
            Mentor Command Center
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-xl leading-relaxed m-0">
            Manage your availability, review AI candidate briefs, conduct 1:1 sessions, and log actionable career items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/mentorship">
            <Button variant="outline" size="sm" className="font-bold text-xs gap-2">
              Student Mentorship View <ChevronRight size={14} />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={loadMentorData} className="p-2">
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-danger-bg p-4 border border-danger/20 text-danger text-sm font-semibold">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Non-Approved State Banner */}
      {!isApprovedMentor && (
        <Card className="border-warning/30 bg-warning-bg/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning-bg rounded-xl text-warning">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-text m-0">
                Mentor Application Status: <span className="uppercase text-warning font-extrabold">{mentorProfile?.mentorStatus || "NOT APPLIED"}</span>
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                {mentorProfile?.mentorStatus === "pending"
                  ? "Your mentor application is currently being reviewed by CareerPilot admins. You will gain access to incoming bookings once approved."
                  : "Submit your mentor application to start guiding candidates, holding 1:1 sessions, and tracking student outcomes."}
              </p>
            </div>
          </div>
          <Link to="/mentorship">
            <Button variant="primary" size="sm" className="whitespace-nowrap font-bold">
              {mentorProfile?.mentorStatus === "pending" ? "View Application" : "Apply as Mentor"}
            </Button>
          </Link>
        </Card>
      )}

      {isApprovedMentor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Summary & Availability (1 Col) */}
          <div className="flex flex-col gap-6">
            <Card className="border-border shadow-sm p-6 bg-surface">
              <CardHeader className="p-0 pb-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User size={16} className="text-primary" /> Mentor Profile
                </CardTitle>
                <Badge variant="success" className="uppercase text-[10px]">Verified Mentor</Badge>
              </CardHeader>
              <CardContent className="p-0 pt-4 flex flex-col gap-4">
                <div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Current Role & Company</span>
                  <p className="text-sm font-bold text-text m-0">
                    {mentorProfile?.mentorProfile?.currentRole || "Software Engineer"} @ {mentorProfile?.mentorProfile?.company || "Tech Corp"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Years of Experience</span>
                  <p className="text-sm font-bold text-text m-0">
                    {mentorProfile?.mentorProfile?.yearsOfExperience || 0} Years
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Specializations</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {mentorProfile?.mentorProfile?.specializations?.map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-[10px]">{spec}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Mentorship Topics</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {mentorProfile?.mentorProfile?.topics?.map((topic) => (
                      <Badge key={topic} variant="outline" className="text-[10px]">{topic}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability Schedule Card */}
            <Card className="border-border shadow-sm p-6 bg-surface">
              <CardHeader className="p-0 pb-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar size={16} className="text-primary" /> Availability Schedule
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="xs" 
                  onClick={() => setEditingAvailability(!editingAvailability)}
                  className="text-xs font-bold text-primary"
                >
                  {editingAvailability ? "Cancel" : "Edit Hours"}
                </Button>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                {editingAvailability ? (
                  <form onSubmit={handleUpdateAvailability} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-text">Timezone</label>
                      <input 
                        type="text"
                        className="bg-bg border border-border text-xs font-semibold p-2 rounded-lg outline-none"
                        value={availabilityForm.timezone}
                        onChange={(e) => setAvailabilityForm({...availabilityForm, timezone: e.target.value})}
                      />
                    </div>
                    <Button type="submit" size="xs" disabled={actionLoading === "availability"}>
                      {actionLoading === "availability" ? "Saving..." : "Save Schedule"}
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary font-medium">Timezone</span>
                      <span className="font-bold text-text">{availabilityForm.timezone}</span>
                    </div>
                    <div className="flex flex-col gap-2 pt-2 border-t border-border">
                      {availabilityForm.weeklySlots.map((slot, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-bg-secondary p-2 rounded border border-border/40">
                          <span className="font-bold text-text">{slot.day}</span>
                          <span className="font-mono text-text-secondary">{slot.startTime} - {slot.endTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Incoming Session Requests & Prep Briefs (2 Cols) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="border-border shadow-sm p-6 bg-surface">
              <CardHeader className="p-0 pb-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap size={18} className="text-primary" /> Incoming Candidate Requests ({requests.length})
                </CardTitle>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Real-time sync</span>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                {requests.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {requests.map((session) => (
                      <div key={session._id} className="border border-border/80 rounded-xl p-5 bg-bg/40 flex flex-col gap-4 hover:border-primary/40 transition-all">
                        {/* Session Top Info */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/40 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm">
                              {session.candidateId?.name?.slice(0, 2)?.toUpperCase() || "ST"}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-text m-0">{session.candidateId?.name || "Candidate"}</h4>
                              <p className="text-[11px] text-text-secondary m-0">{session.candidateId?.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={session.status === 'confirmed' ? 'success' : session.status === 'completed' ? 'primary' : session.status === 'cancelled' ? 'danger' : 'warning'}
                              className="uppercase text-[10px] font-bold"
                            >
                              {session.status}
                            </Badge>
                            <span className="text-xs font-mono font-bold text-text bg-bg-secondary px-2.5 py-1 rounded border border-border">
                              {session.duration || 45} mins
                            </span>
                          </div>
                        </div>

                        {/* Booking Details & Proposed Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-bg-secondary p-3 rounded-lg border border-border/30">
                            <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Session Topic</span>
                            <span className="font-bold text-text">{session.topic}</span>
                          </div>

                          <div className="bg-bg-secondary p-3 rounded-lg border border-border/30">
                            <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Scheduled Time</span>
                            <span className="font-bold text-text flex items-center gap-1.5">
                              <Clock size={12} className="text-primary" />
                              {new Date(session.scheduledAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Candidate Goal Description */}
                        {session.description && (
                          <div className="text-xs text-text-secondary bg-surface p-3 rounded-lg border border-border/40">
                            <span className="font-bold text-text block mb-0.5">Candidate Goal:</span>
                            {session.description}
                          </div>
                        )}

                        {/* AI Student Prep Brief */}
                        {session.aiPrepBrief && (
                          <div className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent border border-primary/20 rounded-xl p-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Sparkles size={14} className="text-primary" />
                              <span className="text-xs font-extrabold text-primary uppercase tracking-wider">AI Candidate Prep Brief</span>
                            </div>
                            <p className="text-xs text-text leading-relaxed m-0">
                              {session.aiPrepBrief.summary || "Student is actively targeting software engineering placements."}
                            </p>
                            {session.aiPrepBrief.topSkillGaps?.length > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-text-secondary uppercase">Focus Skill Gaps:</span>
                                <div className="flex flex-wrap gap-1">
                                  {session.aiPrepBrief.topSkillGaps.map((gap, i) => (
                                    <span key={i} className="text-[10px] font-bold bg-danger-bg text-danger px-2 py-0.5 rounded border border-danger/20">
                                      {gap}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          {session.status === 'requested' && (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="xs" 
                                variant="primary"
                                disabled={actionLoading === session._id}
                                onClick={() => handleUpdateRequestStatus(session._id, 'confirmed')}
                              >
                                Accept Request
                              </Button>
                              <Button 
                                size="xs" 
                                variant="outline"
                                disabled={actionLoading === session._id}
                                onClick={() => handleUpdateRequestStatus(session._id, 'cancelled')}
                              >
                                Decline
                              </Button>
                            </div>
                          )}

                          {session.status === 'confirmed' && (
                            <div className="flex flex-col gap-3 w-full">
                              {completingSessionId === session._id ? (
                                <form onSubmit={handleCompleteSession} className="flex flex-col gap-4 mt-2 border-t border-border pt-4 bg-surface p-4 rounded-xl border">
                                  <h4 className="text-xs font-extrabold text-text uppercase">Log Session Feedback & Action Items</h4>
                                  
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-text">Direct Feedback to Candidate</label>
                                    <textarea 
                                      rows={3}
                                      required
                                      className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none"
                                      placeholder="Provide summary of candidate performance, strengths, and improvement areas..."
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
                                      {completionLoading ? "Saving..." : "Submit Log & Complete"}
                                    </Button>
                                    <Button type="button" variant="outline" size="xs" onClick={() => setCompletingSessionId(null)}>Cancel</Button>
                                  </div>
                                </form>
                              ) : (
                                <Button size="xs" className="w-fit font-bold" onClick={() => setCompletingSessionId(session._id)}>
                                  Complete Session & Log Feedback
                                </Button>
                              )}
                            </div>
                          )}

                          {session.status === 'completed' && session.mentorFeedback && (
                            <div className="text-xs text-text-secondary bg-success-bg/10 p-3 rounded-lg border border-success/20 w-full">
                              <span className="font-bold text-success block mb-0.5">Logged Feedback:</span>
                              {session.mentorFeedback}
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-text-secondary flex flex-col items-center gap-2">
                    <FileText size={32} className="opacity-40" />
                    <p className="text-xs italic font-medium m-0">No incoming candidate requests registered yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
