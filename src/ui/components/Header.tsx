import React from 'react';
import { Settings, HelpCircle, Check } from 'lucide-react';
import type { TabId } from '../../types/common';

interface HeaderProps {
  onTabChange: (tab: TabId) => void;
}

export function Header({ onTabChange }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-figma-border bg-figma-bg">
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-lg"
          style={{
            background: 'var(--figma-color-bg-brand)',
          }}
        >
          <Check size={13} className="text-white" strokeWidth={3} />
        </div>
        <span className="text-sm font-bold text-figma-text tracking-tight">Figxed</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          className="btn-ghost p-1.5 rounded-lg"
          onClick={() => onTabChange('settings')}
          title="Settings"
        >
          <Settings size={14} className="text-figma-icon-secondary" />
        </button>
        <button
          className="btn-ghost p-1.5 rounded-lg"
          title="Help"
          onClick={() =>
            window.open('https://github.com/figxed/figxed-plugin', '_blank')
          }
        >
          <HelpCircle size={14} className="text-figma-icon-secondary" />
        </button>
      </div>
    </div>
  );
}
