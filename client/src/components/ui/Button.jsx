import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  className = '', 
  disabled, 
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary',
    secondary: 'bg-surface text-text-secondary border border-border hover:bg-bg-secondary focus:ring-primary',
    danger: 'bg-danger text-white hover:opacity-90 focus:ring-danger',
    success: 'bg-success text-white hover:opacity-90 focus:ring-success',
    outline: 'bg-transparent text-primary border border-primary hover:bg-primary-bg focus:ring-primary',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-secondary focus:ring-border',
    link: 'bg-transparent text-primary hover:underline focus:ring-primary p-0'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[52px]'
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
      {children}
    </button>
  );
}
