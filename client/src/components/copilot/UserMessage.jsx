import React from 'react';
import { User } from 'lucide-react';

export function UserMessage({ message }) {
  const content = typeof message === 'string' ? message : message?.content || '';

  return (
    <div className="flex gap-3 flex-row-reverse items-start my-2 animate-fade-in">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
        <User size={15} />
      </div>

      <div className="max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl bg-primary text-white font-medium text-xs leading-relaxed rounded-tr-xs shadow-xs whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
