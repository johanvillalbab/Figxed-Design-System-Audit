import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const smooth = [0.32, 0.72, 0, 1] as const;

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: smooth }}
    >
      <motion.div
        className="w-14 h-14 rounded-2xl bg-figma-bg-secondary flex items-center justify-center mb-4 text-figma-icon-secondary"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.5, ease: smooth }}
      >
        {icon}
      </motion.div>
      <motion.h3
        className="text-sm font-semibold text-figma-text mb-1"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: smooth }}
      >
        {title}
      </motion.h3>
      <motion.p
        className="text-xs text-figma-text-tertiary mb-4 max-w-[240px] leading-relaxed"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4, ease: smooth }}
      >
        {description}
      </motion.p>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: smooth }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
