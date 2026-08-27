import React from "react";
import { Card, CardContent } from "../components/ui/Card";
import { Sparkles } from "lucide-react";

export function PlaceholderPage({ title, description, phase }) {
  return (
    <Card className="shadow-sm border-border min-h-[300px] flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
      <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="bg-primary/10 p-4 rounded-full text-primary mb-2 shadow-inner border border-primary/20">
          <Sparkles size={32} />
        </div>
        <span className="text-xs font-bold text-primary uppercase tracking-widest block">
          {phase ? `Coming in ${phase}` : "Coming in a later phase"}
        </span>
        <h2 className="text-3xl font-extrabold text-text m-0">{title}</h2>
        <p className="text-text-secondary leading-relaxed max-w-lg m-0 text-base">{description}</p>
      </CardContent>
    </Card>
  );
}
