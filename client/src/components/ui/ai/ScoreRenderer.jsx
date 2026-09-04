import React from 'react';
import { Award, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function ScoreRenderer({ 
  score = 0, 
  title = "Score", 
  breakdown = null, 
  evidence = [], 
  calculationVersion = "1.0",
  timestamp = null 
}) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (s >= 60) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="my-3 p-4 border border-border rounded-xl bg-surface shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h4 className="font-bold text-text text-sm">{title}</h4>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(normalizedScore)} flex items-center gap-1`}>
          <span>{normalizedScore}%</span>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && typeof breakdown === 'object' && Object.keys(breakdown).length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-text uppercase tracking-wider">Breakdown</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(breakdown).map(([key, val], idx) => (
              <div key={idx} className="p-2 rounded-lg bg-bg-secondary flex justify-between items-center">
                <span className="text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-bold text-text">{typeof val === 'number' ? `${val}%` : String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      {evidence && evidence.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Evidence</span>
          </p>
          <ul className="space-y-1">
            {evidence.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-text-secondary">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-text-secondary pt-1 border-t border-border/50">
        <span>Version: {calculationVersion}</span>
        <span>{timestamp ? new Date(timestamp).toLocaleDateString() : 'Real-time calculation'}</span>
      </div>
    </div>
  );
}
