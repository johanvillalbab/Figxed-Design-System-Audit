import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthScoreProps {
  score: number | null;
}

function getScoreClass(score: number): { label: string; className: string; color: string } {
  if (score >= 90) return { label: 'Excellent', className: 'score-excellent', color: 'var(--figma-color-bg-success)' };
  if (score >= 75) return { label: 'Good', className: 'score-good', color: 'var(--figma-color-bg-success)' };
  if (score >= 50) return { label: 'Needs Work', className: 'score-needs-work', color: 'var(--figma-color-bg-warning)' };
  return { label: 'Critical', className: 'score-critical', color: 'var(--figma-color-bg-danger)' };
}

function CircularProgress({ score, color, size = 80 }: { score: number; color: string; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="circular-progress-bg"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="circular-progress-bar"
          style={{}}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xl font-bold score-value"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        >
          {score}%
        </motion.span>
      </div>
    </div>
  );
}

export function HealthScore({ score }: HealthScoreProps) {
  if (score === null) {
    return (
      <motion.div
        className="card bg-figma-bg-secondary text-center py-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-figma-bg-tertiary flex items-center justify-center">
            <span className="text-xl text-figma-text-tertiary">?</span>
          </div>
          <p className="text-xs text-figma-text-tertiary">
            Run an audit to see your health score
          </p>
        </div>
      </motion.div>
    );
  }

  const info = getScoreClass(score);

  return (
    <motion.div
      className={`card border text-center py-4 ${info.className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="section-label mb-2">File Health</p>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress score={score} color={info.color} />
        <motion.span
          className="badge score-badge"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {info.label}
        </motion.span>
      </div>
    </motion.div>
  );
}
