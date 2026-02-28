import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckSquare, Square, X } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { postToPlugin } from '../hooks/usePluginMessages';

interface PagePickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pageIds: string[]) => void;
  actionLabel?: string;
}

export function PagePicker({ open, onClose, onConfirm, actionLabel = 'Scan Selected Pages' }: PagePickerProps) {
  const {
    filePages,
    selectedPageIds,
    togglePageSelection,
    selectAllPages,
    deselectAllPages,
  } = useStore();

  useEffect(() => {
    if (open && filePages.length === 0) {
      postToPlugin({ type: 'GET_FILE_PAGES' });
    }
  }, [open, filePages.length]);

  const allSelected = filePages.length > 0 && selectedPageIds.length === filePages.length;
  const noneSelected = selectedPageIds.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-figma-bg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-3.5 py-3 border-b border-figma-border">
            <div>
              <h3 className="text-xs font-semibold text-figma-text">Select Pages</h3>
              <p className="text-2xs text-figma-text-tertiary mt-0.5">
                {selectedPageIds.length} of {filePages.length} pages selected
              </p>
            </div>
            <button
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-figma-bg-hover text-figma-text-tertiary transition-colors cursor-pointer"
              onClick={onClose}
            >
              <X size={14} />
            </button>
          </div>

          {/* Select all / none */}
          <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 border-b border-figma-border">
            <button
              className="text-2xs font-medium text-figma-brand hover:underline cursor-pointer"
              onClick={allSelected ? deselectAllPages : selectAllPages}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Page list */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filePages.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 spinner" />
              </div>
            ) : (
              filePages.map((page, idx) => {
                const isSelected = selectedPageIds.includes(page.id);
                return (
                  <motion.button
                    key={page.id}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-figma-bg-hover cursor-pointer text-left"
                    style={{ transition: 'background-color 0.2s cubic-bezier(0.32, 0.72, 0, 1)' }}
                    onClick={() => togglePageSelection(page.id)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.4), duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <span className="shrink-0" style={{ color: isSelected ? 'var(--figma-color-bg-brand)' : 'var(--figma-color-text-tertiary)' }}>
                      {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </span>
                    <FileText size={12} className="shrink-0 text-figma-text-tertiary" />
                    <span className="text-xs text-figma-text truncate flex-1">
                      {page.name}
                    </span>
                    <span className="text-2xs text-figma-text-tertiary tabular-nums shrink-0">
                      {idx + 1}
                    </span>
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-3.5 border-t border-figma-border bg-figma-bg">
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={() => onConfirm(selectedPageIds)}
              disabled={noneSelected}
            >
              {actionLabel}
              {!noneSelected && (
                <span className="text-2xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded-full">
                  {selectedPageIds.length}
                </span>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
