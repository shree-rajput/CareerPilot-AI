import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { authApi } from "../api/auth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("No reset token found in URL.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-bold text-text m-0">Reset Password</h1>
          <p className="text-xs text-text-secondary">Enter a new secure password for your account.</p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-success-bg/20 border border-success-border/40 rounded-xl flex items-center gap-3 text-left">
              <CheckCircle size={20} className="text-success shrink-0" />
              <p className="text-xs font-semibold text-text m-0">
                Password reset successfully! You can now log in with your new password.
              </p>
            </div>

            <Button onClick={() => navigate("/login")} className="w-full" size="md">
              Proceed to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-danger-bg/20 border border-danger-border/40 rounded-xl flex items-center gap-2 text-left text-xs font-semibold text-danger">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-text block mb-1">New Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text block mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text outline-none focus:border-primary"
              />
            </div>

            <Button type="submit" isLoading={loading} className="w-full" size="md">
              Update Password
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-bold text-text-secondary hover:text-text">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
