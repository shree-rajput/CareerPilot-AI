import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InterviewReportPage } from "./pages/InterviewReportPage";
import { InterviewSessionPage } from "./pages/InterviewSessionPage";
import { InterviewSetupPage } from "./pages/InterviewSetupPage";
import { MatchResultPage } from "./pages/MatchResultPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ResumePage } from "./pages/ResumePage";
import { ResumeStudioPage } from "./pages/ResumeStudioPage";
import { SettingsPage } from "./pages/SettingsPage";
import PeerInterviewRoomPage from "./pages/PeerInterviewRoomPage";
import PeerInterviewSetupPage from "./pages/PeerInterviewSetup";
import PeerInterviewReportPage from "./pages/PeerInterviewReportPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { JobBoardPage } from "./pages/JobBoardPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { SkillsPage } from "./pages/SkillsPage";
import { PreparationPage } from "./pages/PreparationPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { MentorshipPage } from "./pages/MentorshipPage";
import { MentorDashboardPage } from "./pages/MentorDashboardPage";
import { CodingPracticePage } from "./pages/CodingPracticePage";

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />

        <Route element={<ProtectedRoute />}>
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
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/preparation" element={<PreparationPage />} />
            <Route path="/projects" element={<ProjectsPage />} />

            <Route path="/match/:id" element={<MatchResultPage />} />

            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/interview" element={<InterviewSetupPage />} />
            <Route
              path="/interview/:sessionId"
              element={<InterviewSessionPage />}
            />
            <Route
              path="/interview/:sessionId/report"
              element={<InterviewReportPage />}
            />

            <Route
              path="/peer-interview/:roomId"
              element={<PeerInterviewRoomPage />}
            />

            <Route
              path="/peer-interview/:roomId/report"
              element={<PeerInterviewReportPage />}
            />

            <Route
              path="/peer-interview"
              element={<PeerInterviewSetupPage />}
            />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/coding" element={<CodingPracticePage />} />
            <Route path="/coding/:id" element={<CodingPracticePage />} />
            <Route path="/mentorship" element={<MentorshipPage />} />
            <Route path="/mentor" element={<Navigate to="/mentor/dashboard" replace />} />
            <Route path="/mentor/dashboard" element={<MentorDashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
