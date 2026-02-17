import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, BarChart3, Settings } from 'lucide-react';
import type { TabId } from '../../types/common';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'adoption', label: 'Adoption', icon: <BarChart3 size={14} /> },
  { id: 'audit', label: 'Audit', icon: <ClipboardCheck size={14} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex border-b border-figma-border bg-figma-bg">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium relative
              ${isActive ? 'text-figma-brand' : 'text-figma-text-secondary'}`}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ backgroundColor: isActive ? 'transparent' : 'var(--figma-color-bg-hover)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {tab.icon}
            {tab.label}
            {isActive && (
              <motion.div
                className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                style={{ backgroundColor: 'var(--figma-color-bg-brand)' }}
                layoutId="tab-indicator"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
