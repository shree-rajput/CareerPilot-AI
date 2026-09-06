import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Mail, ArrowRight } from "lucide-react";
import { authApi } from "../api/auth";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage("No verification token found in URL. Please check the link from your email.");
      return;
    }

    verifyToken(token);
  }, [token]);

  async function verifyToken(rawToken) {
    setLoading(true);
    try {
      const res = await authApi.verifyEmail(rawToken);
      setSuccess(true);
      setMessage(res.message || "Your email address has been verified successfully!");
    } catch (err) {
      setSuccess(false);
      setMessage(err.response?.data?.message || "Invalid or expired email verification token.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e) {
    e.preventDefault();
    if (!resendEmail) return;

    setResending(true);
    try {
      const res = await authApi.resendVerification(resendEmail);
      setResendSuccess(true);
      setMessage(res.message || "Verification link sent!");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Mail size={32} />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-text m-0">Email Verification</h1>
          <p className="text-xs text-text-secondary mt-1">CareerPilot AI Account Security</p>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="text-xs font-semibold text-text-secondary">Verifying your token...</span>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="p-3 bg-success-bg/20 border border-success-border/40 rounded-xl flex items-center gap-3 text-left">
              <CheckCircle size={20} className="text-success shrink-0" />
              <p className="text-xs font-semibold text-text m-0">{message}</p>
            </div>

            <Button onClick={() => navigate("/dashboard")} className="w-full" size="md">
              Go to Dashboard <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-danger-bg/20 border border-danger-border/40 rounded-xl flex items-center gap-3 text-left">
              <XCircle size={20} className="text-danger shrink-0" />
              <p className="text-xs font-semibold text-text m-0">{message}</p>
            </div>

            {/* Resend Form */}
            <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
              <label className="text-xs font-bold text-text block">Resend Verification Email</label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text outline-none focus:border-primary"
              />
              <Button type="submit" variant="secondary" isLoading={resending} className="w-full" size="sm">
                Resend Verification Email
              </Button>
              {resendSuccess && (
                <p className="text-[11px] text-success font-medium text-center m-0">
                  Verification email sent! Check your inbox.
                </p>
              )}
            </form>

            <div className="pt-2 border-t border-border">
              <Link to="/login" className="text-xs font-bold text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
