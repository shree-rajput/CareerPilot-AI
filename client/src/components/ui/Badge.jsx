import React from 'react';

export function Badge({ children, variant = 'primary', className = '' }) {
  const variants = {
    primary: 'bg-primary-bg text-primary border-primary/20',
    success: 'bg-success-bg text-success border-success/20',
    warning: 'bg-warning-bg text-warning border-warning/20',
    danger: 'bg-danger-bg text-danger border-danger/20',
    secondary: 'bg-bg-secondary text-text-secondary border-border',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${variants[variant] || variants.primary} ${className}`}>
      {children}
    </span>
  );
}
