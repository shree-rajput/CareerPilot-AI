import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-white border border-border rounded-lg shadow-sm overflow-hidden ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`px-6 py-4 border-b border-border ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-lg font-bold text-text m-0 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`px-6 py-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`px-6 py-4 bg-bg-secondary border-t border-border flex items-center ${className}`} {...props}>
      {children}
    </div>
  );
}
