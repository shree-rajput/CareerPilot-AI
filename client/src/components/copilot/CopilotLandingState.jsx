import React from 'react';
import { Bot, Sparkles, FileText, Briefcase, HelpCircle, Code, ChevronRight } from 'lucide-react';

export function CopilotLandingState({ onSelectPrompt }) {
  const categories = [
    {
      icon: <FileText size={16} className="text-blue-500" />,
      title: "Resume & Profile",
      prompts: [
        "Analyze my resume for Frontend Engineer roles",
        "Explain the key weaknesses in my resume"
      ]
    },
    {
      icon: <Briefcase size={16} className="text-emerald-500" />,
      title: "Projects & Impact",
      prompts: [
        "Prepare interview questions for my EdTech project",
        "How can I present my project architecture effectively?"
      ]
    },
    {
      icon: <HelpCircle size={16} className="text-purple-500" />,
      title: "Interview Preparation",
      prompts: [
        "Generate top 5 STAR behavioral questions for my background",
        "What questions can an interviewer ask about my React experience?"
      ]
    },
    {
      icon: <Code size={16} className="text-amber-500" />,
      title: "System Design & Skills",
      prompts: [
        "Identify my top skill gaps for Senior Software Engineer",
        "Generate a 7-day study plan for System Design"
      ]
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8 max-w-2xl mx-auto">
      <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-sm">
        <Bot size={28} />
      </div>

      <h2 className="text-xl font-bold text-text mb-2">How can I assist your career goals today?</h2>
      <p className="text-xs text-text-secondary mb-8 max-w-md leading-relaxed">
        I have full visibility into your candidate profile, resume, projects, and target roles to provide personalized preparation.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {categories.map((cat, idx) => (
          <div key={idx} className="p-3.5 bg-bg-secondary/60 border border-border/80 rounded-xl hover:border-primary/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              {cat.icon}
              <span className="text-xs font-bold text-text">{cat.title}</span>
            </div>
            <div className="space-y-1.5">
              {cat.prompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onSelectPrompt && onSelectPrompt(prompt)}
                  className="w-full text-left p-2 rounded-lg bg-surface border border-border/50 hover:border-primary/50 text-[11px] font-medium text-text-secondary hover:text-primary transition-all flex items-center justify-between group"
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
