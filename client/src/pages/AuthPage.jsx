import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { AlertCircle } from "lucide-react";

export function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await signup(form);
      } else {
        await login({ email: form.email, password: form.password });
      }

      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete the request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md shadow-xs border-border">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-primary-bg border border-primary-border">
                <img src="/favicon.png" alt="CareerPilot Logo" className="w-4 h-4 object-contain" />
              </div>
              <span className="text-primary font-extrabold text-[11px] uppercase tracking-wider">CareerPilot AI</span>
            </div>
            <h1 id="auth-title" className="text-xl font-bold text-text tracking-tight m-0">
              {isSignup ? "Create workspace account" : "Log in to workspace"}
            </h1>
            <p className="text-xs text-text-secondary m-0 leading-relaxed font-medium">
              Access your resume intelligence, application tracker, and AI interview practice loop.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <Input
                label="Full Name"
                autoComplete="name"
                name="name"
                onChange={updateField}
                required
                type="text"
                value={form.name}
              />
            )}

            <Input
              label="Work Email"
              autoComplete="email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />

            <Input
              label="Password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-danger-bg p-3 border border-danger-border text-danger text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="m-0">{error}</p>
              </div>
            )}

            <Button className="w-full h-10 mt-1" disabled={isSubmitting} type="submit" isLoading={isSubmitting}>
              {isSignup ? "Create Account" : "Log In"}
            </Button>
          </form>

          <p className="text-center text-xs text-text-secondary m-0">
            {isSignup ? "Already have an account?" : "New to CareerPilot?"}{" "}
            <Link to={isSignup ? "/login" : "/signup"} className="text-primary hover:underline font-bold transition-colors">
              {isSignup ? "Log in" : "Create account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
