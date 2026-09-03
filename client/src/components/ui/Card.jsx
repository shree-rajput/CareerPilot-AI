import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-surface border border-border rounded-xl shadow-xs overflow-hidden transition-all duration-200 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`px-5 py-4 border-b border-border flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-sm font-bold text-text m-0 flex items-center gap-2 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`px-5 py-3.5 bg-bg-secondary/40 border-t border-border flex items-center ${className}`} {...props}>
      {children}
    </div>
  );
}
