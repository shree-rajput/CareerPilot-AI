import React from 'react';

export function Badge({ children, variant = 'primary', size = 'sm', className = '' }) {
  const variants = {
    primary: 'bg-primary-bg text-primary border-primary-border/60',
    success: 'bg-success-bg text-success border-success-border/60',
    warning: 'bg-warning-bg text-warning border-warning-border/60',
    danger: 'bg-danger-bg text-danger border-danger-border/60',
    info: 'bg-info-bg text-info border-info-border/60',
    secondary: 'bg-bg-secondary text-text-secondary border-border',
    outline: 'bg-transparent text-text-secondary border-border',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px] font-semibold h-4',
    sm: 'px-2.5 py-0.5 text-[11px] font-semibold h-5.5',
    md: 'px-3 py-1 text-xs font-semibold h-6.5',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border ${variants[variant] || variants.primary} ${sizes[size] || sizes.sm} ${className}`}>
      {children}
    </span>
  );
}
