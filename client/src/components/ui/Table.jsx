import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
      <table className={`w-full text-left text-xs ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }) {
  return <thead className="bg-bg-secondary text-text-secondary border-b border-border font-semibold">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TableRow({ children, className = '' }) {
  return <tr className={`hover:bg-bg-secondary/40 transition-colors ${className}`}>{children}</tr>;
}

export function TableHead({ children, className = '' }) {
  return <th className={`px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-text-secondary ${className}`}>{children}</th>;
}

export function TableCell({ children, className = '' }) {
  return <td className={`px-4 py-3.5 text-text font-medium ${className}`}>{children}</td>;
}
