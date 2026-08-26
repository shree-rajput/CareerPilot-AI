import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <Loader2 
      className={`animate-spin text-primary ${sizes[size]} ${className}`} 
    />
  );
}

export function FullScreenLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg">
      <Spinner size="lg" className="mb-4" />
      <p className="text-text-secondary font-medium">{message}</p>
    </div>
  );
}
