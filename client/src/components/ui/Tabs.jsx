import React, { useState } from 'react';

export function Tabs({ tabs, defaultTab, onChange, className = '' }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (id) => {
    setActiveTab(id);
    if (onChange) onChange(id);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex space-x-1 bg-bg-secondary p-1 rounded-lg border border-border shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-surface text-text shadow-2xs border border-border/40'
                : 'text-text-secondary hover:text-text hover:bg-surface/50'
            }`}
          >
            {tab.icon && <tab.icon size={14} />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 focus:outline-none">
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
