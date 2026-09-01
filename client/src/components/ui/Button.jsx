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
  const baseStyles = 'inline-flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shrink-0';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-2xs focus:ring-primary',
    secondary: 'bg-surface text-text border border-border hover:bg-bg-secondary focus:ring-primary',
    subtle: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 focus:ring-primary',
    danger: 'bg-danger text-white hover:opacity-90 focus:ring-danger',
    success: 'bg-success text-white hover:opacity-90 focus:ring-success',
    outline: 'bg-transparent text-primary border border-primary/40 hover:bg-primary/10 focus:ring-primary',
    ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-bg-secondary focus:ring-border',
    link: 'bg-transparent text-primary hover:underline focus:ring-primary p-0 h-auto min-h-0'
  };

  const sizes = {
    xs: 'px-2.5 py-1 text-[11px] font-semibold h-7 min-h-[28px] gap-1 rounded-md',
    sm: 'px-3 py-1.5 text-xs font-bold h-8 min-h-[32px] gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-xs font-bold h-9 min-h-[36px] gap-2 rounded-lg',
    lg: 'px-5 py-2.5 text-sm font-bold h-10 min-h-[40px] gap-2 rounded-lg'
  };

  const selectedSize = sizes[size] || sizes.md;
  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button 
      className={`${baseStyles} ${selectedVariant} ${selectedSize} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
      {children}
    </button>
  );
}
