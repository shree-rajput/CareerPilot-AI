import React from 'react';
import { Sparkles, FileText, Briefcase, HelpCircle, Code, ChevronRight, Zap } from 'lucide-react';

export function CopilotLandingState({ onSelectPrompt }) {
  const categories = [
    {
      icon: <FileText size={16} className="text-blue-500" />,
      title: "Resume & Profile Intelligence",
      prompts: [
        "Analyze my resume for Frontend Engineer roles",
        "What are the top skill gaps in my resume?"
      ]
    },
    {
      icon: <Briefcase size={16} className="text-emerald-500" />,
      title: "Projects & Architecture",
      prompts: [
        "Prepare interview questions for my EdTech project",
        "How can I present my project architecture effectively?"
      ]
    },
    {
      icon: <HelpCircle size={16} className="text-purple-500" />,
      title: "Interview Preparation",
      prompts: [
        "Generate top STAR behavioral questions for my background",
        "What questions can an interviewer ask about my React experience?"
      ]
    },
    {
      icon: <Code size={16} className="text-amber-500" />,
      title: "Technical & Roadmaps",
      prompts: [
        "What is JavaScript closure and how does it work?",
        "Create a 7-day preparation roadmap for System Design"
      ]
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4 py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-md">
        <Sparkles size={26} className="text-primary animate-pulse" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3 shadow-2xs">
        <Zap size={13} className="fill-primary/20" />
        <span>Personalized Career Placement Coach</span>
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-text tracking-tight mb-2">
        How can I assist your career goals today?
      </h2>
      <p className="text-xs sm:text-sm text-text-secondary mb-8 max-w-md leading-relaxed font-medium">
        Powered by your candidate context, resume, projects, and target role intelligence.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className="p-4 bg-bg-secondary/40 border border-border/70 rounded-2xl hover:border-primary/40 transition-all space-y-2.5 shadow-2xs backdrop-blur-xs"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-surface border border-border/60 shadow-2xs">
                {cat.icon}
              </div>
              <span className="text-xs font-bold text-text">{cat.title}</span>
            </div>

            <div className="space-y-1.5">
              {cat.prompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => onSelectPrompt && onSelectPrompt(prompt)}
                  className="w-full text-left p-2.5 rounded-xl bg-surface border border-border/60 hover:border-primary/50 text-[11px] font-semibold text-text-secondary hover:text-primary transition-all flex items-center justify-between group cursor-pointer shadow-2xs active:scale-98"
                >
                  <span className="truncate pr-2">{prompt}</span>
                  <ChevronRight size={12} className="shrink-0 text-text-muted group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
