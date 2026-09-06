import React, { useState, useEffect } from "react";
import { 
  getPendingMentorApplications, reviewMentorApplication, 
  updateMentorVerification, suspendMentor, 
  getMentorReports, resolveMentorReport, getMentors 
} from "../api/mentor";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { toast } from "../context/ToastContext";
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock, 
  UserX, UserCheck, Award, Briefcase, FileText, AlertCircle, RefreshCw 
} from "lucide-react";

export function AdminMentorModerationPage() {
  const [activeTab, setActiveTab] = useState("applications"); // applications, verifications, reports
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applications, setApplications] = useState([]);
  const [reports, setReports] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // Review modal state
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: "approved",
    rejectionReason: "",
    identityStatus: "verified",
    employmentStatus: "verified",
    expertiseStatus: "verified"
  });

  // Suspension modal state
  const [suspendingMentorId, setSuspendingMentorId] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  useEffect(() => {
    loadModerationData();
  }, [activeTab]);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      setError("");
      if (activeTab === "applications") {
        const res = await getPendingMentorApplications();
        setApplications(res.data || []);
      } else if (activeTab === "reports") {
        const res = await getMentorReports();
        setReports(res.data || []);
      } else if (activeTab === "verifications") {
        const res = await getMentors();
        setMentors(res.data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load moderation data.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewApplicationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      setActionLoading(selectedApp._id);
      await reviewMentorApplication(selectedApp._id, reviewForm);
      toast.success(`Application ${reviewForm.status} successfully!`);
      setSelectedApp(null);
      loadModerationData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process application review.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVerification = async (mentorId, field, currentStatus) => {
    const nextStatus = currentStatus === "verified" ? "unverified" : "verified";
    try {
      setActionLoading(`${mentorId}-${field}`);
      await updateMentorVerification(mentorId, { [field]: nextStatus });
      toast.success(`Updated ${field} to ${nextStatus}`);
      loadModerationData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update verification status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendSubmit = async (e) => {
    e.preventDefault();
    if (!suspendingMentorId) return;
    try {
      setActionLoading(suspendingMentorId);
      await suspendMentor(suspendingMentorId, { suspended: true, reason: suspensionReason });
      toast.success("Mentor suspended successfully.");
      setSuspendingMentorId(null);
      setSuspensionReason("");
      loadModerationData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to suspend mentor.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreMentor = async (mentorId) => {
    try {
      setActionLoading(mentorId);
      await suspendMentor(mentorId, { suspended: false });
      toast.success("Mentor access restored.");
      loadModerationData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore mentor.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = async (reportId, status, resolutionNotes) => {
    try {
      setActionLoading(reportId);
      await resolveMentorReport(reportId, { status, resolutionNotes });
      toast.success(`Report status updated to ${status}`);
      loadModerationData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve report.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-y-auto custom-scrollbar pb-16 animate-in fade-in">
      
      {/* Admin Header */}
      <div className="bg-surface border-b border-border p-6 md:p-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-danger/10 text-danger px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
              <ShieldCheck size={12} /> Admin Authorization Level
            </div>
            <h1 className="text-xl md:text-2xl font-black text-text m-0">Mentor Platform Moderation Hub</h1>
            <p className="text-xs text-text-secondary mt-1 m-0">Review pending mentor applications, manage granular verifications, and audit safety reports.</p>
          </div>

          <div className="flex gap-1 bg-bg-secondary p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("applications")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${activeTab === "applications" ? "bg-primary text-white" : "text-text-secondary hover:bg-border"}`}
            >
              Applications ({applications.length})
            </button>
            <button
              onClick={() => setActiveTab("verifications")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${activeTab === "verifications" ? "bg-primary text-white" : "text-text-secondary hover:bg-border"}`}
            >
              Mentors & Verification
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${activeTab === "reports" ? "bg-primary text-white" : "text-text-secondary hover:bg-border"}`}
            >
              Safety Reports
            </button>
            <Button variant="ghost" size="xs" onClick={loadModerationData} className="p-1.5">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-8 w-full flex flex-col gap-6">
        
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-bg text-danger border border-danger/20 rounded-xl text-xs font-bold">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Spinner size="lg" className="text-primary" />
            <span className="text-xs font-semibold text-text-secondary mt-2">Loading moderation records...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: PENDING APPLICATIONS */}
            {activeTab === "applications" && (
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider m-0">Pending Onboarding Applications</h2>
                
                {applications.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {applications.map((app) => (
                      <div key={app._id} className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-base font-extrabold text-text m-0">{app.applicantName}</h3>
                            <p className="text-xs font-semibold text-text-secondary m-0 mt-0.5">{app.role} @ {app.company} ({app.experienceYears} YOE)</p>
                          </div>
                          <span className="bg-warning/15 text-warning text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-warning/20">
                            Pending Review
                          </span>
                        </div>

                        <p className="text-xs text-text-secondary font-medium leading-relaxed m-0 bg-bg p-3 rounded-lg border border-border">
                          "{app.bio}"
                        </p>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="text-text-secondary">Skills:</span>
                          {app.skills?.map((s, i) => (
                            <span key={i} className="bg-bg-secondary text-text px-2 py-0.5 rounded text-[11px] font-bold">{s}</span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center border-t border-border pt-3">
                          <div className="flex gap-4 text-xs font-bold text-primary">
                            {app.linkedinUrl && <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">LinkedIn Profile ↗</a>}
                            {app.githubUrl && <a href={app.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub Profile ↗</a>}
                          </div>

                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => setSelectedApp(app)}
                            className="font-extrabold"
                          >
                            Review & Decide
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic text-center py-12 bg-surface border border-dashed border-border rounded-xl">
                    No pending mentor applications to review.
                  </p>
                )}
              </div>
            )}

            {/* TAB 2: MENTORS & GRANULAR VERIFICATION */}
            {activeTab === "verifications" && (
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider m-0">Mentor Ecosystem & Verification Controls</h2>
                
                {mentors.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {mentors.map((mentor) => {
                      const ver = mentor.verificationId || {};
                      const isSuspended = mentor.isSuspended;

                      return (
                        <div key={mentor._id} className={`bg-surface border rounded-xl p-5 shadow-sm flex flex-col gap-4 ${isSuspended ? "border-danger/30 bg-danger-bg/5" : "border-border"}`}>
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold text-text m-0">{mentor.userId?.name}</h3>
                                {isSuspended && (
                                  <span className="bg-danger text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                    SUSPENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-text-secondary m-0 mt-0.5">{mentor.role} @ {mentor.company}</p>
                            </div>

                            <div className="flex gap-2">
                              {isSuspended ? (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => handleRestoreMentor(mentor._id)}
                                  className="text-success border-success/30 font-bold"
                                >
                                  <UserCheck size={14} className="mr-1" /> Restore Access
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => setSuspendingMentorId(mentor._id)}
                                  className="text-danger border-danger/30 font-bold"
                                >
                                  <UserX size={14} className="mr-1" /> Suspend
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Granular Verification Toggles */}
                          <div className="bg-bg p-3.5 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <span className="text-xs font-extrabold text-text uppercase">Granular Badges:</span>
                            
                            <div className="flex flex-wrap gap-3 text-xs font-bold">
                              <button
                                onClick={() => handleToggleVerification(mentor._id, "identityStatus", ver.identityStatus)}
                                className={`px-3 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                                  ver.identityStatus === "verified" ? "bg-success/15 border-success/30 text-success" : "bg-bg-secondary border-border text-text-secondary"
                                }`}
                              >
                                <CheckCircle2 size={14} /> Identity ({ver.identityStatus || "unverified"})
                              </button>

                              <button
                                onClick={() => handleToggleVerification(mentor._id, "employmentStatus", ver.employmentStatus)}
                                className={`px-3 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                                  ver.employmentStatus === "verified" ? "bg-primary/15 border-primary/30 text-primary" : "bg-bg-secondary border-border text-text-secondary"
                                }`}
                              >
                                <Briefcase size={14} /> Employment ({ver.employmentStatus || "unverified"})
                              </button>

                              <button
                                onClick={() => handleToggleVerification(mentor._id, "expertiseStatus", ver.expertiseStatus)}
                                className={`px-3 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                                  ver.expertiseStatus === "verified" ? "bg-purple-500/15 border-purple-500/30 text-purple-400" : "bg-bg-secondary border-border text-text-secondary"
                                }`}
                              >
                                <Award size={14} /> Expertise ({ver.expertiseStatus || "unverified"})
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic text-center py-12 bg-surface border border-dashed border-border rounded-xl">
                    No mentors registered.
                  </p>
                )}
              </div>
            )}

            {/* TAB 3: SAFETY & CONDUCT REPORTS */}
            {activeTab === "reports" && (
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider m-0">Safety & Conduct Incident Reports</h2>
                
                {reports.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {reports.map((rep) => (
                      <div key={rep._id} className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] font-black uppercase bg-danger/15 text-danger px-2.5 py-0.5 rounded border border-danger/20">
                              {rep.reasonCategory}
                            </span>
                            <h3 className="text-sm font-bold text-text mt-2 m-0">Report against: {rep.mentorId?.userId?.name || "Mentor"}</h3>
                            <span className="text-[11px] text-text-secondary font-semibold">Reporter: {rep.reporterId?.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-text-secondary">{rep.status}</span>
                        </div>

                        <p className="text-xs text-text font-medium bg-bg p-3 rounded-lg border border-border m-0">
                          "{rep.description}"
                        </p>

                        {rep.status === "open" && (
                          <div className="flex gap-2 justify-end border-t border-border pt-3">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleResolveReport(rep._id, "dismissed", "Dismissed after admin review")}
                            >
                              Dismiss Report
                            </Button>
                            <Button
                              size="xs"
                              variant="primary"
                              className="bg-danger text-white font-bold"
                              onClick={() => handleResolveReport(rep._id, "action_taken", "Admin action taken")}
                            >
                              Action Taken
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic text-center py-12 bg-surface border border-dashed border-border rounded-xl">
                    No safety reports lodged.
                  </p>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-text m-0">Review Application: {selectedApp.applicantName}</h2>

            <form onSubmit={handleReviewApplicationSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text">Decision</label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                  className="bg-bg border border-border text-xs font-bold text-text p-2.5 rounded-lg"
                >
                  <option value="approved">Approve Application</option>
                  <option value="rejected">Reject Application</option>
                </select>
              </div>

              {reviewForm.status === "rejected" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Rejection Reason</label>
                  <textarea
                    rows={3}
                    required
                    className="bg-bg border border-border text-xs font-semibold text-text p-2 rounded-lg"
                    value={reviewForm.rejectionReason}
                    onChange={(e) => setReviewForm({ ...reviewForm, rejectionReason: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSelectedApp(null)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={actionLoading === selectedApp._id}>
                  {actionLoading === selectedApp._id ? "Processing..." : "Confirm Decision"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspension Modal */}
      {suspendingMentorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-danger m-0">Suspend Mentor</h2>
            
            <form onSubmit={handleSuspendSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text">Reason for Suspension</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail violation..."
                  className="bg-bg border border-border text-xs font-semibold text-text p-2 rounded-lg"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSuspendingMentorId(null)}>Cancel</Button>
                <Button type="submit" className="bg-danger text-white font-extrabold">Confirm Suspension</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
