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
import { SettingsPage } from "./pages/SettingsPage";
import PeerInterviewRoomPage from "./pages/PeerInterviewRoomPage";
import PeerInterviewSetupPage from "./pages/PeerInterviewSetup";
export function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/resume" element={<ResumePage />} />

            <Route path="/applications" element={<ApplicationsPage />} />
            <Route
              path="/applications/:id"
              element={<ApplicationDetailPage />}
            />

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
              path="/peer-interview"
              element={<PeerInterviewSetupPage />}
            />

            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}
