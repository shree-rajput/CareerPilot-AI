import React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

export function Alert({ variant = 'info', title, children, className = '' }) {
  const variants = {
    info: 'bg-info-bg border-info-border/60 text-info',
    success: 'bg-success-bg border-success-border/60 text-success',
    warning: 'bg-warning-bg border-warning-border/60 text-warning',
    danger: 'bg-danger-bg border-danger-border/60 text-danger'
  };

  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertCircle,
    danger: XCircle
  };

  const Icon = icons[variant];

  return (
    <div className={`p-3.5 rounded-lg border flex items-start gap-2.5 text-xs ${variants[variant] || variants.info} ${className}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-0.5 min-w-0">
        {title && <strong className="font-semibold text-text">{title}</strong>}
        {children && <div className="leading-relaxed opacity-90 font-medium">{children}</div>}
      </div>
    </div>
  );
}
