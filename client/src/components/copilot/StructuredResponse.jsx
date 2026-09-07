import React from 'react';
import { Briefcase, Code, CheckCircle, HelpCircle, Calendar, Sparkles } from 'lucide-react';

export function ProjectContextCard({ project }) {
  if (!project) return null;
  const { name, role, techStack, description, architecture } = project;

  return (
    <div className="my-3 p-4 bg-bg-secondary/70 border border-primary/20 rounded-xl shadow-xs space-y-2 text-xs">
      <div className="flex items-center gap-2 text-primary font-bold border-b border-border/50 pb-2">
        <Briefcase size={15} />
        <span>Project Context: {name || 'Featured Project'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-text">
        {role && (
          <div>
            <span className="text-text-secondary font-semibold">Role: </span>
            <span className="font-medium">{role}</span>
          </div>
        )}
        {techStack && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-text-secondary font-semibold">Tech Stack: </span>
            {Array.isArray(techStack) ? (
              techStack.map((tech, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px]">{tech}</span>
              ))
            ) : (
              <span className="font-medium">{techStack}</span>
            )}
          </div>
        )}
      </div>

      {description && <p className="text-text-secondary leading-relaxed pt-1 m-0">{description}</p>}
      {architecture && (
        <div className="pt-1 text-[11px] text-text-muted">
          <span className="font-bold text-text-secondary">Architecture: </span>
          <span>{architecture}</span>
        </div>
      )}
    </div>
  );
}

export function SkillListCard({ matchedSkills = [], missingSkills = [] }) {
  if (!matchedSkills.length && !missingSkills.length) return null;

  return (
    <div className="my-3 p-3.5 bg-bg-secondary/50 border border-border rounded-xl space-y-2 text-xs">
      <div className="flex items-center gap-2 text-text font-bold">
        <Code size={15} className="text-primary" />
        <span>Skill Analysis</span>
      </div>

      {matchedSkills.length > 0 && (
        <div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Matched Skills</span>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.map((s, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1">
                <CheckCircle size={10} />
                <span>{s}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {missingSkills.length > 0 && (
        <div className="pt-1">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block mb-1">Target Skill Gaps</span>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.map((s, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function InterviewQuestionCard({ questions = [] }) {
  if (!Array.isArray(questions) || !questions.length) return null;

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-text mb-1">
        <HelpCircle size={15} className="text-primary" />
        <span>Interview Questions</span>
      </div>

      {questions.map((q, idx) => {
        const questionText = typeof q === 'string' ? q : q.question || q.text || '';
        const category = typeof q === 'object' ? q.category : null;

        return (
          <div key={idx} className="p-3 bg-surface border border-border/80 rounded-xl space-y-1 text-xs hover:border-primary/40 transition-colors shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-primary shrink-0">#{idx + 1}</span>
              <p className="flex-1 font-semibold text-text leading-relaxed m-0">{questionText}</p>
              {category && (
                <span className="px-2 py-0.5 rounded bg-bg-secondary text-text-secondary text-[10px] font-medium shrink-0">
                  {category}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PreparationPlanCard({ plan = [] }) {
  if (!Array.isArray(plan) || !plan.length) return null;

  return (
    <div className="my-3 p-4 bg-bg-secondary/60 border border-border rounded-xl space-y-2 text-xs">
      <div className="flex items-center gap-2 text-text font-bold border-b border-border/50 pb-2">
        <Calendar size={15} className="text-primary" />
        <span>Actionable Practice Roadmap</span>
      </div>

      <div className="space-y-2 pt-1">
        {plan.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 p-2 bg-surface rounded-lg border border-border/40">
            <div className="w-5 h-5 rounded bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              {item.day || idx + 1}
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-text block">{item.focus || item.topic || `Day ${idx + 1}`}</span>
              <p className="text-text-secondary text-[11px] leading-relaxed m-0">{item.action || item.task || item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StructuredResponse({ structuredData }) {
  if (!structuredData || typeof structuredData !== 'object') return null;

  return (
    <div className="space-y-2">
      {structuredData.projectContext && <ProjectContextCard project={structuredData.projectContext} />}
      {(structuredData.matchedSkills || structuredData.missingSkills) && (
        <SkillListCard matchedSkills={structuredData.matchedSkills} missingSkills={structuredData.missingSkills} />
      )}
      {structuredData.interviewQuestions && <InterviewQuestionCard questions={structuredData.interviewQuestions} />}
      {structuredData.prepPlan && <PreparationPlanCard plan={structuredData.prepPlan} />}
    </div>
  );
}
