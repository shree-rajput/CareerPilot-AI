import React from 'react';
import { AlertCircle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { MarkdownRenderer } from '../../MarkdownRenderer';

const intentConfig = {
  info: {
    icon: Info,
    containerClass: 'bg-primary/10 border-primary/20 text-text',
    iconClass: 'text-primary'
  },
  warning: {
    icon: AlertCircle,
    containerClass: 'bg-amber-500/10 border-amber-500/20 text-text',
    iconClass: 'text-amber-500'
  },
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-emerald-500/10 border-emerald-500/20 text-text',
    iconClass: 'text-emerald-500'
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-rose-500/10 border-rose-500/20 text-text',
    iconClass: 'text-rose-500'
  }
};

export function CalloutBlock({ intent = 'info', title, content }) {
  if (!content) return null;
  const config = intentConfig[intent] || intentConfig.info;
  const Icon = config.icon;

  return (
    <div className={`my-2 p-3 rounded-lg border flex gap-3 ${config.containerClass}`}>
      <Icon size={18} className={`shrink-0 mt-0.5 ${config.iconClass}`} />
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-bold text-sm m-0 leading-none">{title}</h5>}
        <div className="text-sm opacity-90 leading-relaxed">
           <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );
}
