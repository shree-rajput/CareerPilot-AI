import React, { useState } from "react";
import { Sparkles, Loader2, RotateCcw, Check, X, AlertTriangle, AlertCircle } from "lucide-react";
import api from "../../api/axios";

/**
 * BulletImprover
 * Inline AI rewrite tool with Set-Difference Guardrail Verification.
 * Flags any numbers, percentages, or technologies in AI output not present in original input.
 */
export function BulletImprover({ resumeId, bullet, section, context, onApply, onClose }) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [applied, setApplied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setOptions(null);
    setSelected(null);
    setApplied(false);
    try {
      const res = await api.post(`/resumes/${resumeId}/improve-bullet`, {
        bullet,
        section,
        context,
      });
      setOptions(res.data?.data?.options || []);
    } catch (err) {
      setError(err?.response?.data?.message || "AI rewrite failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function applyOption(text) {
    setSelected(text);
    setApplied(true);
    onApply(text);
    setTimeout(onClose, 800);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text">AI Bullet Rewriter</h3>
              <p className="text-[10px] text-text-secondary font-medium">
                Set-difference guardrail enabled: verifies metrics & claims against original input
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Original bullet */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
              Original Input
            </label>
            <div className="bg-bg-secondary border border-border rounded-xl p-3 text-sm text-text leading-relaxed">
              {bullet}
            </div>
          </div>

          {/* Generate button */}
          {!options && !loading && (
            <button
              onClick={generate}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
            >
              <Sparkles size={15} /> Generate 3 Alternatives
            </button>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
              <p className="text-xs text-text-secondary font-semibold">Generating verified alternatives...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 text-danger text-sm font-medium px-3 py-2.5 rounded-xl">
              <AlertCircle size={14} /> {error}
              <button onClick={generate} className="ml-auto text-xs font-bold underline hover:no-underline cursor-pointer">
                Retry
              </button>
            </div>
          )}

          {/* Options */}
          {options && options.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  Select & Verify Alternative
                </label>
                <button
                  onClick={generate}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
                >
                  <RotateCcw size={9} /> Regenerate
                </button>
              </div>

              {options.map((opt, i) => (
                <div
                  key={i}
                  className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 transition-all group ${
                    selected === opt.text
                      ? "border-success bg-success/5"
                      : "border-border hover:border-primary/40 bg-surface"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-md bg-bg-secondary flex items-center justify-center text-[10px] font-black text-text mt-0.5">
                      {selected === opt.text ? <Check size={10} className="text-success" /> : String.fromCharCode(65 + i)}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-text leading-relaxed m-0 font-medium">{opt.text}</p>
                      {opt.rationale && (
                        <p className="text-[10px] text-text-secondary italic m-0 mt-1">{opt.rationale}</p>
                      )}
                    </div>
                  </div>

                  {/* SET-DIFFERENCE GUARDRAIL WARNING */}
                  {opt.needsUserInput && opt.unverifiedEntities && opt.unverifiedEntities.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2 text-warning text-[11px]">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Unverified Claim: </span>
                        <span>
                          "{opt.unverifiedEntities.join(", ")}" was not present in original input. Confirm before applying.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => !applied && applyOption(opt.text)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        opt.needsUserInput
                          ? "bg-warning/15 hover:bg-warning/25 text-warning border border-warning/30"
                          : "bg-primary hover:bg-primary-hover text-white shadow-xs"
                      }`}
                    >
                      {opt.needsUserInput ? "Confirm & Apply" : "Apply Rewrite"}
                    </button>
                  </div>

                  {selected === opt.text && applied && (
                    <div className="absolute inset-0 flex items-center justify-center bg-success/20 backdrop-blur-xs rounded-xl">
                      <div className="flex items-center gap-2 text-success font-bold text-sm bg-surface px-4 py-2 rounded-xl shadow-lg border border-success/30">
                        <Check size={16} /> Applied!
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
