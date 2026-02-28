import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'info' | 'success' | 'error';
  position?: 'top' | 'bottom';
  onDismiss: () => void;
}

const iconMap = {
  info: <Info size={14} />,
  success: <CheckCircle size={14} />,
  error: <AlertCircle size={14} />,
};

const styleMap = {
  info: 'notification-info',
  success: 'notification-success',
  error: 'notification-error',
};

export function Notification({ message, type, position = 'bottom', onDismiss }: NotificationProps) {
  const isTop = position === 'top';

  return (
    <motion.div
      className={`fixed left-2.5 right-2.5 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium shadow-lg border ${styleMap[type]}`}
      style={isTop ? { top: 96 } : { bottom: 24 }}
      initial={{ opacity: 0, y: isTop ? -10 : 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isTop ? -6 : 6, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
    >
      <span className="shrink-0">{iconMap[type]}</span>
      <span className="flex-1 truncate">{message}</span>
      <button
        onClick={onDismiss}
        className="p-0.5 hover:opacity-70 rounded shrink-0 cursor-pointer"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
