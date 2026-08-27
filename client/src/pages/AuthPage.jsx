import React from "react";
import { useState } from "react";
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
    <main className="min-h-screen bg-bg flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <Card className="w-full max-w-md relative z-10 shadow-xl border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardContent className="p-8 sm:p-10 flex flex-col gap-8">
          <div>
            <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2 block">CareerPilot AI</span>
            <h1 id="auth-title" className="text-3xl font-extrabold text-text tracking-tight mb-2">
              {isSignup ? "Create workspace" : "Log in to workspace"}
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              Build your resume, application tracker, match engine, and interview practice loop from
              one place.
            </p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {isSignup && (
              <Input
                label="Name"
                autoComplete="name"
                name="name"
                onChange={updateField}
                required
                type="text"
                value={form.name}
              />
            )}

            <Input
              label="Email"
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
              <div className="flex items-start gap-3 rounded-lg bg-danger-bg p-4 border border-danger/20 text-danger">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <Button className="w-full h-12 text-base mt-2" disabled={isSubmitting} type="submit" isLoading={isSubmitting}>
              {isSignup ? "Sign up" : "Log in"}
            </Button>
          </form>

          <p className="text-center text-text-secondary text-sm">
            {isSignup ? "Already have an account?" : "New to CareerPilot?"}{" "}
            <Link to={isSignup ? "/login" : "/signup"} className="text-primary hover:text-primary-hover font-bold transition-colors">
              {isSignup ? "Log in" : "Create account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
