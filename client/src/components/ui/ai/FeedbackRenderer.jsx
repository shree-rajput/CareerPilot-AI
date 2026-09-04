import { ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';

export function FeedbackRenderer({ 
  strengths = [], 
  weaknesses = [], 
  improvements = [] 
}) {
  const hasData = strengths.length > 0 || weaknesses.length > 0 || improvements.length > 0;
  if (!hasData) return null;

  return (
    <div className="my-3 grid grid-cols-1 md:grid-cols-3 gap-3">
      {strengths.length > 0 && (
        <div className="p-3.5 border border-emerald-500/20 bg-emerald-500/5 rounded-xl space-y-2">
          <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <ThumbsUp size={14} /> Strengths
          </h5>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {strengths.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div className="p-3.5 border border-rose-500/20 bg-rose-500/5 rounded-xl space-y-2">
          <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <ThumbsDown size={14} /> Areas to Address
          </h5>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {weaknesses.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-rose-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {improvements.length > 0 && (
        <div className="p-3.5 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-2">
          <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} /> Recommended Action Steps
          </h5>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {improvements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
