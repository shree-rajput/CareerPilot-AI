import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { Button } from "../../components/ui/Button";

export function MentorLoginPage() {
  const { login, user, isAuthenticated, isBootstrapping } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isBootstrapping) {
    return <div className="screen-loader flex h-screen items-center justify-center bg-bg">Loading...</div>;
  }

  // If already authenticated and mentor, go to dashboard
  if (isAuthenticated && ["mentor", "admin"].includes(user?.role)) {
    return <Navigate to="/mentor/dashboard" replace />;
  }

  // If already authenticated but student, force logout or just warn (here we force logout to switch accounts)
  if (isAuthenticated && user?.role === "student") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] font-sans">
        <div className="w-full max-w-md p-8 bg-[#161616] rounded-2xl shadow-2xl border border-white/10 text-center">
          <h2 className="text-xl font-bold text-white mb-4">Unauthorized</h2>
          <p className="text-white/60 mb-6">You are currently logged in as a student. You must log out first to access the Mentor Portal.</p>
          <Button onClick={() => window.location.href = "/dashboard"} className="w-full">
            Return to Student Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
      // RoleProtectedRoute will handle if they logged in but aren't a mentor
      navigate("/mentor/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a] font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
      
      <div className="w-full max-w-md p-8 bg-[#161616] rounded-2xl shadow-2xl border border-white/10 z-10">
        <div className="text-center mb-10">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl mb-4 shadow-lg">
            M
          </div>
          <h1 className="text-2xl font-bold text-white">Mentor Portal</h1>
          <p className="text-sm text-white/50 mt-2">Sign in to manage your mentees</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="mentor@example.com"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
