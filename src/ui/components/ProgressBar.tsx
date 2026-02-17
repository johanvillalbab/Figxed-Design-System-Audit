import React from 'react';
import { motion } from 'framer-motion';
import type { ProgressPayload } from '../../types/common';

interface ProgressBarProps {
  progress: ProgressPayload;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <motion.div
      className="px-3.5 py-2.5 bg-figma-bg-secondary border-b border-figma-border"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-2xs font-medium text-figma-text-secondary">
          {progress.label || 'Scanning...'}
        </span>
        <span className="text-2xs text-figma-text-tertiary tabular-nums">
          {progress.current}/{progress.total} ({percentage}%)
        </span>
      </div>
      <div className="w-full h-1.5 bg-figma-bg-tertiary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'var(--figma-color-bg-brand)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
