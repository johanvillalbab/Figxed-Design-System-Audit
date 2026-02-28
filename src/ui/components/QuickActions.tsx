import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, FolderOpen, Files } from 'lucide-react';
import { postToPlugin } from '../hooks/usePluginMessages';
import { useStore } from '../hooks/useStore';
import { PagePicker } from './PagePicker';
import type { AuditScope } from '../../types/common';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } },
};

export function QuickActions() {
  const { selectionCount, setIsAuditing, setLastAuditScope } = useStore();
  const [showPagePicker, setShowPagePicker] = useState(false);

  function startAudit(scope: AuditScope, pageIds?: string[]) {
    setIsAuditing(true);
    setLastAuditScope(scope);
    postToPlugin({ type: 'START_AUDIT', payload: { scope, pageIds } });
  }

  function handleFileAudit() {
    postToPlugin({ type: 'GET_FILE_PAGES' });
    setShowPagePicker(true);
  }

  function handlePagePickerConfirm(pageIds: string[]) {
    setShowPagePicker(false);
    startAudit('pages', pageIds);
  }

  return (
    <>
      <motion.div
        className="space-y-2.5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.p className="section-label" variants={itemVariants}>
          Quick Actions
        </motion.p>

        <motion.button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={() => startAudit('selection')}
          disabled={selectionCount === 0}
          variants={itemVariants}
        >
          <Search size={14} />
          Audit Selection
          {selectionCount > 0 && (
            <span className="text-2xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded-full">
              {selectionCount}
            </span>
          )}
        </motion.button>

        <motion.div className="flex gap-2" variants={itemVariants}>
          <button
            className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
            onClick={() => startAudit('page')}
          >
            <FileText size={13} />
            Audit Page
          </button>
          <button
            className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
            onClick={handleFileAudit}
          >
            <Files size={13} />
            Audit File
          </button>
        </motion.div>
      </motion.div>

      <PagePicker
        open={showPagePicker}
        onClose={() => setShowPagePicker(false)}
        onConfirm={handlePagePickerConfirm}
        actionLabel="Audit Selected Pages"
      />
    </>
  );
}
