import React from 'react';
import { Settings, Check, Zap } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import type { TabId } from '../../types/common';

interface HeaderProps {
  onTabChange: (tab: TabId) => void;
}

export function Header({ onTabChange }: HeaderProps) {
  const setShowHelp = useStore((s) => s.setShowHelp);

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
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md text-2xs font-medium text-figma-text-secondary hover:bg-figma-bg-hover transition-colors cursor-pointer"
          onClick={() => setShowHelp(true)}
          title="Tips & Guide"
        >
          <Zap size={11} />
          Tips
        </button>
        <button
          className="btn-ghost p-1.5 rounded-lg"
          onClick={() => onTabChange('settings')}
          title="Settings"
        >
          <Settings size={14} className="text-figma-icon-secondary" />
        </button>
      </div>
    </div>
  );
}
