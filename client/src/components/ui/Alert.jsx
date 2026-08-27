import React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

export function Alert({ variant = 'info', title, children, className = '' }) {
  const variants = {
    info: 'bg-info-bg border-info/20 text-info',
    success: 'bg-success-bg border-success/20 text-success',
    warning: 'bg-warning-bg border-warning/20 text-warning',
    danger: 'bg-danger-bg border-danger/20 text-danger'
  };

  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertCircle,
    danger: XCircle
  };

  const Icon = icons[variant];

  return (
    <div className={`p-4 rounded-xl border flex gap-3 ${variants[variant]} ${className}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1 text-sm">
        {title && <strong className="font-bold">{title}</strong>}
        {children && <div className="opacity-90 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
