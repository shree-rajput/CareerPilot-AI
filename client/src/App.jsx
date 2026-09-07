import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { MentorLayout } from "./components/MentorLayout";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InterviewReportPage } from "./pages/InterviewReportPage";
import { InterviewSessionPage } from "./pages/InterviewSessionPage";
import { InterviewSetupPage } from "./pages/InterviewSetupPage";
import { InterviewHistoryPage } from "./pages/InterviewHistoryPage";
import { InterviewReplayPage } from "./pages/InterviewReplayPage";
import { MatchResultPage } from "./pages/MatchResultPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ResumePage } from "./pages/ResumePage";
import { ResumeStudioPage } from "./pages/ResumeStudioPage";
import { SettingsPage } from "./pages/SettingsPage";
import PeerInterviewRoomPage from "./pages/PeerInterviewRoomPage";
import PeerInterviewSetupPage from "./pages/PeerInterviewSetup";
import PeerInterviewReportPage from "./pages/PeerInterviewReportPage";
import TechDiscussionSetupPage from "./pages/TechDiscussionSetupPage";
import TechDiscussionRoomPage from "./pages/TechDiscussionRoomPage";
import TechDiscussionReportPage from "./pages/TechDiscussionReportPage";
import TechDiscussionHistoryPage from "./pages/TechDiscussionHistoryPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { JobBoardPage } from "./pages/JobBoardPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { JobInboxPage } from "./pages/JobInboxPage";
import { SkillsPage } from "./pages/SkillsPage";
import { PreparationPage } from "./pages/PreparationPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { MentorshipPage } from "./pages/MentorshipPage";
import { MentorProfilePage } from "./pages/MentorProfilePage";
import { MentorLoginPage } from "./pages/mentor/MentorLoginPage";
import { MentorDashboardPage } from "./pages/mentor/MentorDashboardPage";
import { MentorStudentsPage } from "./pages/mentor/MentorStudentsPage";
import { MentorStudentDetailPage } from "./pages/mentor/MentorStudentDetailPage";
import { MentorFeedbackPage } from "./pages/mentor/MentorFeedbackPage";
import { MentorAnalyticsPage } from "./pages/mentor/MentorAnalyticsPage";
import { BecomeAMentorPage } from "./pages/BecomeAMentorPage";
import { MentorSessionRoomPage } from "./pages/MentorSessionRoomPage";
import { AdminMentorModerationPage } from "./pages/AdminMentorModerationPage";
import { CodingPracticePage } from "./pages/CodingPracticePage";
import { CopilotPage } from "./pages/CopilotPage";
import { ExtensionAuthorizePage } from "./pages/ExtensionAuthorizePage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Isolated Mentor Portal */}
        <Route path="/mentor/login" element={<MentorLoginPage />} />
        <Route element={<RoleProtectedRoute role={["mentor", "admin"]} />}>
          <Route element={<MentorLayout />}>
            <Route path="/mentor/dashboard" element={<MentorDashboardPage />} />
            <Route path="/mentor/students" element={<MentorStudentsPage />} />
            <Route path="/mentor/students/:studentId" element={<MentorStudentDetailPage />} />
            <Route path="/mentor/feedback" element={<MentorFeedbackPage />} />
            <Route path="/mentor/analytics" element={<MentorAnalyticsPage />} />
            <Route path="/mentor/profile" element={<MentorProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          {/* Extension Connect Page (Standalone layout) */}
          <Route path="/extension/connect" element={<ExtensionAuthorizePage />} />

          {/* Standalone Route for Copilot */}
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/copilot/shared/:token" element={<CopilotPage />} />

          {/* Main Application Routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/resume" element={<ResumePage />} />
            <Route path="/resume/studio/:id" element={<ResumeStudioPage />} />

            <Route path="/applications" element={<ApplicationsPage />} />
            <Route
              path="/applications/:id"
              element={<ApplicationDetailPage />}
            />

            <Route path="/jobs" element={<JobBoardPage />} />
            <Route path="/jobs/inbox" element={<JobInboxPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/skills" element={<Navigate to="/preparation" replace />} />
            <Route path="/prepare" element={<Navigate to="/preparation" replace />} />
            <Route path="/preparation" element={<PreparationPage />} />
            <Route path="/projects" element={<ProjectsPage />} />

            <Route path="/match/:id" element={<MatchResultPage />} />

            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/interview" element={<InterviewSetupPage />} />
            <Route path="/interview-history" element={<InterviewHistoryPage />} />
            <Route
              path="/interview/:sessionId"
              element={<InterviewSessionPage />}
            />
            <Route
              path="/interview/:sessionId/report"
              element={<InterviewReportPage />}
            />
            <Route
              path="/interview-replay/:sessionId"
              element={<InterviewReplayPage />}
            />

            <Route
              path="/tech-discussion"
              element={<TechDiscussionSetupPage />}
            />
            <Route
              path="/tech-discussion/history"
              element={<TechDiscussionHistoryPage />}
            />
            <Route
              path="/tech-discussion/:roomId"
              element={<TechDiscussionRoomPage />}
            />
            <Route
              path="/tech-discussion/:roomId/report"
              element={<Navigate to="/tech-discussion/history" replace />}
            />

            {/* Redirects for legacy peer interview links */}
            <Route
              path="/peer-interview/:roomId/report"
              element={<Navigate to="/tech-discussion/history" replace />}
            />
            <Route
              path="/peer-interview/:roomId"
              element={<TechDiscussionRoomPage />}
            />
            <Route
              path="/peer-interview"
              element={<Navigate to="/tech-discussion" replace />}
            />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/coding" element={<Navigate to="/preparation" replace />} />
            <Route path="/coding/:id" element={<Navigate to="/preparation" replace />} />
            <Route path="/mentorship" element={<MentorshipPage />} />
            <Route path="/mentorship/profile/:mentorId" element={<MentorProfilePage />} />
            <Route path="/become-a-mentor" element={<BecomeAMentorPage />} />
            <Route path="/mentor/session/:sessionId" element={<MentorSessionRoomPage />} />
            
            {/* Admin Protected Routes */}
            <Route element={<RoleProtectedRoute role={["admin"]} />}>
              <Route path="/admin/mentors" element={<AdminMentorModerationPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
