import React, { useState } from "react";
import { Sparkles, Loader2, RotateCcw, Check, ChevronRight, X, AlertCircle } from "lucide-react";
import api from "../../api/axios";

/**
 * BulletImprover
 * Inline AI rewrite tool for resume bullets.
 * Takes a bullet text, sends to /api/resumes/:id/improve-bullet,
 * displays 3 options in a modal. User picks one to replace the original.
 *
 * @param {{ resumeId: string, bullet: string, section: string, context: string, onApply: (text: string) => void }} props
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
        context
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">AI Bullet Rewriter</h3>
              <p className="text-[10px] text-slate-500 font-medium">Only rewrites what's there — never invents</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Original bullet */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Original</label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 leading-relaxed">
              {bullet}
            </div>
          </div>

          {/* Generate button */}
          {!options && !loading && (
            <button
              onClick={generate}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm"
            >
              <Sparkles size={15} /> Generate 3 Alternatives
            </button>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-blue-600" />
              </div>
              <p className="text-xs text-slate-500 font-semibold">Generating alternatives...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-3 py-2.5 rounded-xl">
              <AlertCircle size={14} /> {error}
              <button onClick={generate} className="ml-auto text-xs font-bold underline hover:no-underline">
                Retry
              </button>
            </div>
          )}

          {/* Options */}
          {options && options.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Choose an Alternative
                </label>
                <button onClick={generate}
                  className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1">
                  <RotateCcw size={9} /> Regenerate
                </button>
              </div>

              {options.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => !applied && applyOption(opt.text)}
                  className={`relative flex flex-col gap-2 p-3.5 rounded-xl border-2 cursor-pointer transition-all group ${selected === opt.text
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-md bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:text-blue-600 mt-0.5 transition-colors">
                      {selected === opt.text ? <Check size={10} className="text-emerald-600" /> : String.fromCharCode(64 + i + 1)}
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed">{opt.text}</p>
                  </div>
                  {opt.rationale && (
                    <p className="text-[10px] text-slate-400 font-medium ml-7 italic">{opt.rationale}</p>
                  )}

                  {selected === opt.text && applied && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10 rounded-xl">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
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
