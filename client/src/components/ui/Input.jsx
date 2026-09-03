import React, { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', error, label, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full bg-surface border border-border rounded-lg h-9 px-3 text-xs text-text placeholder-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-2xs ${
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
