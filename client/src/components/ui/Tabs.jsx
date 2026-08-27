import React, { useState } from 'react';

export function Tabs({ tabs, defaultTab, onChange, className = '' }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (id) => {
    setActiveTab(id);
    if (onChange) onChange(id);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex space-x-1 bg-bg-secondary p-1 rounded-xl border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-text shadow-sm'
                : 'text-text-secondary hover:text-text hover:bg-white/50'
            }`}
          >
            {tab.icon && <tab.icon size={16} />}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4 focus:outline-none">
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
