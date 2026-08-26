import React, { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', error, label, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full bg-white border border-border rounded-lg min-h-[44px] px-3 py-2 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow ${
          error ? 'border-danger focus:border-danger focus:ring-danger/15' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
