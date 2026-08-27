import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-text/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className={`relative bg-surface rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${className}`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-text m-0">{title}</h3>
            <button 
              onClick={onClose}
              className="text-text-secondary hover:bg-bg-secondary p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className={title ? "p-6 overflow-y-auto max-h-[calc(100vh-120px)]" : ""}>
          {children}
        </div>
      </div>
    </div>
  );
}
