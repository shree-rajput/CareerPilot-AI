import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Chrome, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { http } from "../api/http";

export function ExtensionAuthorizePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isBootstrapping } = useAuth();
  
  const extensionId = searchParams.get("extensionId") || "";
  const [authorizing, setAuthorizing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      // Redirect to login with returnUrl
      navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [isAuthenticated, isBootstrapping, navigate]);

  const handleAuthorize = async () => {
    setAuthorizing(true);
    setError(null);
    try {
      // 1. Request short-lived 1-time authorization code from backend
      const res = await http.post("/auth/extension-code");
      const code = res.data?.code;

      if (!code) {
        throw new Error("Failed to generate authorization code.");
      }

      // 2. Try communicating directly with extension service worker
      let sentToExtension = false;
      if (extensionId && typeof window.chrome !== "undefined" && window.chrome.runtime) {
        try {
          await new Promise((resolve, reject) => {
            window.chrome.runtime.sendMessage(extensionId, { type: "SET_AUTH_CODE", code }, (response) => {
              if (window.chrome.runtime.lastError) {
                reject(window.chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
          sentToExtension = true;
        } catch (e) {
          console.warn("Direct messaging to extension failed, fallback to storage signal:", e);
        }
      }

      // 3. Store in localStorage as a fallback signal for active extension popups
      localStorage.setItem("cp_ext_auth_code", JSON.stringify({ code, timestamp: Date.now() }));

      setSuccess(true);
    } catch (err) {
      console.error("Authorization error:", err);
      setError(err.message || "Failed to authorize extension. Please try again.");
    } finally {
      setAuthorizing(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 shadow-xl space-y-6 text-center">
        {/* Top Header Badge */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
          <Chrome size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-text tracking-tight">Connect CareerPilot AI</h1>
          <p className="text-xs text-text-muted">
            Authorize the CareerPilot Chrome Extension to capture job opportunities into your workspace with one click.
          </p>
        </div>

        {user && (
          <div className="p-3.5 bg-bg-secondary border border-border rounded-xl flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-text truncate">{user.name}</div>
              <div className="text-[11px] text-text-muted truncate">{user.email}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-text">Extension Connected!</h3>
              <p className="text-xs text-text-muted">
                You can now close this tab and return to your job search. Open the CareerPilot extension icon anytime to capture jobs.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <button
              onClick={handleAuthorize}
              disabled={authorizing}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authorizing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Authorizing...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Authorize Extension <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-[11px] text-text-muted">
              No passwords or sensitive tokens are exposed. You can disconnect anytime from extension settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
