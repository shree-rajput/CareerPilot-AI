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
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 select-none';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-2xs border border-transparent',
    secondary: 'bg-surface text-text border border-border hover:bg-bg-secondary hover:border-border-hover active:bg-border/30 shadow-2xs',
    subtle: 'bg-primary-bg text-primary border border-primary-border/60 hover:bg-primary/10 active:bg-primary/20',
    danger: 'bg-danger text-white hover:bg-danger-hover active:bg-danger/90 shadow-2xs border border-transparent',
    success: 'bg-success text-white hover:bg-success-hover active:bg-success/90 shadow-2xs border border-transparent',
    outline: 'bg-transparent text-primary border border-primary/30 hover:bg-primary-bg hover:border-primary/60',
    ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-bg-secondary active:bg-border/30',
    link: 'bg-transparent text-primary hover:underline p-0 h-auto min-h-0 font-semibold'
  };

  const sizes = {
    xs: 'px-2.5 py-1 text-[11px] h-7 min-h-[28px] gap-1 rounded-md',
    sm: 'px-3 py-1 text-xs h-8 min-h-[32px] gap-1.5 rounded-lg',
    md: 'px-3.5 py-1.5 text-xs h-9 min-h-[36px] gap-2 rounded-lg',
    lg: 'px-4 py-2 text-sm h-10 min-h-[40px] gap-2 rounded-lg'
  };

  const selectedSize = sizes[size] || sizes.md;
  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button 
      className={`${baseStyles} ${selectedVariant} ${selectedSize} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}
