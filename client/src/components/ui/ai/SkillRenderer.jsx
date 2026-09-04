import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export function SkillRenderer({ 
  matchedSkills = [], 
  missingSkills = [], 
  requiredSkills = [], 
  preferredSkills = [] 
}) {
  return (
    <div className="my-3 space-y-3 p-4 border border-border rounded-xl bg-surface">
      {matchedSkills.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle size={14} /> Matched Skills ({matchedSkills.length})
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.map((skill, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {missingSkills.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertCircle size={14} /> Missing Skills ({missingSkills.length})
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.map((skill, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {requiredSkills.length > 0 && matchedSkills.length === 0 && missingSkills.length === 0 && (
        <div>
          <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles size={14} /> Required Skills
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {requiredSkills.map((skill, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
