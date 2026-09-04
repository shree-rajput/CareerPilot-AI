import React from 'react';

export function TableRenderer({ headers = [], rows = [], className = '' }) {
  if (!rows || rows.length === 0) return null;

  const columns = headers.length > 0 ? headers : Object.keys(rows[0] || {});

  return (
    <div className={`my-3 overflow-x-auto border border-border rounded-xl shadow-sm bg-surface ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-bg-secondary border-b border-border text-text font-semibold uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className="p-3">
                {String(col).replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-bg-secondary/50 transition-colors text-text-secondary">
              {columns.map((col, cIdx) => {
                const cellValue = typeof row === 'object' && row !== null ? row[col] : row;
                return (
                  <td key={cIdx} className="p-3 font-medium">
                    {typeof cellValue === 'object' && cellValue !== null
                      ? JSON.stringify(cellValue)
                      : String(cellValue ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
