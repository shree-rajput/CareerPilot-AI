import { Lightbulb, ArrowRight, CheckSquare } from 'lucide-react';

export function RecommendationRenderer({ items = [], title = "Actionable Recommendations" }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="my-3 p-4 border border-border rounded-xl bg-surface space-y-3">
      <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <span>{title}</span>
      </h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="p-2.5 rounded-lg bg-bg-secondary border border-border/50 flex items-start gap-2.5 text-xs text-text-secondary hover:text-text transition-colors">
            <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed flex-1">{typeof item === 'string' ? item : JSON.stringify(item)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
