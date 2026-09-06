import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  getMentorProfileById, getMentorSlots 
} from "../api/mentor";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { MentorshipBookingModal } from "../components/mentor/MentorshipBookingModal";
import { ReportMentorModal } from "../components/mentor/ReportMentorModal";
import { 
  Users, ShieldCheck, Star, Calendar, Clock, ArrowLeft, CheckCircle2, 
  Award, Briefcase, BookOpen, MessageSquare, ShieldAlert, Sparkles 
} from "lucide-react";

export function MentorProfilePage() {
  const { mentorId } = useParams();
  const [mentorData, setMentorData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [mentorId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMentorProfileById(mentorId);
      setMentorData(res.data.mentorProfile || res.data);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load mentor profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-bg">
        <Spinner size="lg" className="text-primary" />
        <span className="text-xs font-semibold text-text-secondary mt-2">Loading Mentor Profile...</span>
      </div>
    );
  }

  if (error || !mentorData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-bg">
        <ShieldAlert size={36} className="text-danger mb-2" />
        <h2 className="text-base font-bold text-text">Profile Unavailable</h2>
        <p className="text-xs text-text-secondary mt-1">{error || "Mentor profile not found."}</p>
        <Link to="/mentorship" className="mt-4">
          <Button variant="outline" size="sm" className="font-bold gap-2">
            <ArrowLeft size={14} /> Return to Discovery
          </Button>
        </Link>
      </div>
    );
  }

  const ver = mentorData.verificationId || {};
  const user = mentorData.userId || {};

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-y-auto custom-scrollbar pb-16 animate-in fade-in">
      
      {/* Back Header */}
      <div className="p-4 md:px-8 border-b border-border bg-surface flex items-center justify-between">
        <Link to="/mentorship" className="text-xs font-bold text-text-secondary hover:text-primary flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Mentors
        </Link>
        <button
          onClick={() => setReportModalOpen(true)}
          className="text-xs font-bold text-danger hover:underline flex items-center gap-1"
        >
          <ShieldAlert size={14} /> Report Concern
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8 w-full">
        
        {/* Profile Card Header */}
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center text-primary font-black text-2xl md:text-3xl shrink-0 shadow-inner">
              {user.name?.slice(0, 2)?.toUpperCase() || "M"}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-text m-0">{user.name}</h1>
                {mentorData.isDemo && (
                  <span className="bg-warning/15 text-warning text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-warning/20">
                    Demo Mentor
                  </span>
                )}
              </div>

              <p className="text-xs md:text-sm font-extrabold text-text-secondary m-0">
                {mentorData.role} @ <span className="text-primary font-bold">{mentorData.company}</span> ({mentorData.experienceYears} Years Exp)
              </p>

              {/* Granular Verification Badges */}
              <div className="flex flex-wrap gap-2 mt-1">
                {ver.identityStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 bg-success/10 text-success text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-success/20">
                    <CheckCircle2 size={12} /> Identity Verified
                  </span>
                )}
                {ver.employmentStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-primary/20">
                    <Briefcase size={12} /> Employment Verified
                  </span>
                )}
                {ver.expertiseStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    <Award size={12} /> Expertise Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
            <div className="flex items-center gap-1 text-right">
              <Star className="text-warning fill-warning" size={20} />
              <span className="text-2xl font-black text-text">{mentorData.rating || "4.8"}</span>
              <span className="text-xs font-bold text-text-secondary">({mentorData.completedSessionsCount || 0} sessions)</span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setBookingModalOpen(true)}
              className="w-full md:w-auto font-extrabold gap-2 shadow-md"
            >
              <Calendar size={16} /> Book 1:1 Session
            </Button>
          </div>
        </div>

        {/* Content Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Bio & Reviews (2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Bio Section */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 m-0">
                <Users size={16} className="text-primary" /> About {user.name}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed font-medium m-0 whitespace-pre-wrap">
                {mentorData.bio || "Passionate engineer dedicated to helping candidates excel in technical interviews, architecture design, and career progression."}
              </p>
            </div>

            {/* Specializations & Skills */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 m-0">
                <Award size={16} className="text-primary" /> Technical Stack & Expertise
              </h2>

              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-text-secondary uppercase block mb-1.5">Primary Technical Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {mentorData.skills?.map((skill, idx) => (
                      <span key={idx} className="bg-bg-secondary text-text text-xs font-bold px-3 py-1 rounded-lg border border-border">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-text-secondary uppercase block mb-1.5">Specializations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {mentorData.specialties?.map((spec, idx) => (
                      <span key={idx} className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-lg border border-primary/20">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Student Reviews Section */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 m-0">
                  <Star size={16} className="text-warning fill-warning" /> Student Feedback ({reviews.length})
                </h2>
                <span className="text-xs font-black text-text">Avg Rating: {mentorData.rating || "4.8"} / 5.0</span>
              </div>

              {reviews.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {reviews.map((rev) => (
                    <div key={rev._id} className="bg-bg p-4 rounded-xl border border-border flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} size={14} className="text-warning fill-warning" />
                          ))}
                        </div>
                        <span className="text-[10px] text-text-secondary font-mono">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-text italic font-medium m-0">"{rev.review}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic text-center py-6">No public reviews logged yet for this mentor.</p>
              )}
            </div>

          </div>

          {/* Right Column: Topics & Quick Booking (1 col) */}
          <div className="flex flex-col gap-6">
            
            {/* Topics Offered */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 m-0">
                <BookOpen size={16} className="text-primary" /> Session Topics
              </h2>
              <ul className="flex flex-col gap-2 p-0 m-0 list-none">
                {mentorData.topics?.map((topic, idx) => (
                  <li key={idx} className="bg-bg p-3 rounded-xl border border-border text-xs font-bold text-text flex items-center gap-2">
                    <Sparkles size={14} className="text-primary shrink-0" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Booking Callout */}
            <div className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-text m-0">Ready for 1:1 Mentorship?</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium m-0">
                Book a session to get personalized guidance, resume feedback, and mock technical interview practice.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => setBookingModalOpen(true)}
                className="font-extrabold gap-2 shadow-sm"
              >
                <Calendar size={16} /> Choose Date & Time
              </Button>
            </div>

          </div>

        </div>

      </div>

      {bookingModalOpen && (
        <MentorshipBookingModal
          mentor={{ ...mentorData, name: user.name }}
          onClose={() => setBookingModalOpen(false)}
          onSuccess={fetchProfile}
        />
      )}

      {reportModalOpen && (
        <ReportMentorModal
          mentorId={mentorData._id}
          mentorName={user.name}
          onClose={() => setReportModalOpen(false)}
        />
      )}

    </div>
  );
}
