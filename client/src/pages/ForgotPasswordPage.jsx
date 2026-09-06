import React, { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { authApi } from "../api/auth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSubmitted(true);
      setMessage(res.message || "If an account exists for this email, a password reset link has been sent.");
    } catch (err) {
      setSubmitted(true);
      setMessage("If an account exists for this email, a password reset link has been sent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
            <KeyRound size={28} />
          </div>
          <h1 className="text-xl font-bold text-text m-0">Forgot Password</h1>
          <p className="text-xs text-text-secondary">
            Enter your account email and we'll send you a password reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-success-bg/20 border border-success-border/40 rounded-xl flex items-start gap-3 text-left">
              <CheckCircle size={20} className="text-success shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-text m-0">Reset Email Dispatched</h4>
                <p className="text-xs text-text-secondary mt-1 m-0">{message}</p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-text block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text outline-none focus:border-primary"
              />
            </div>

            <Button type="submit" isLoading={loading} className="w-full" size="md">
              Send Password Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-bold text-text-secondary hover:text-text inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
