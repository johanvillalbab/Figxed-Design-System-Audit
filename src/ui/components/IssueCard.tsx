import React, { useCallback, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Palette,
  Ruler,
  Circle,
  Wand2,
  EyeOff,
  MousePointerClick,
  ArrowRight,
} from 'lucide-react';
import { postToPlugin } from '../hooks/usePluginMessages';
import { useStore } from '../hooks/useStore';
import type { AuditIssue, AuditCategory } from '../../types/audit';
import type { IssueSeverity } from '../../types/common';

// ─── Metadata maps ────────────────────────────────────────────────────────────

const categoryMeta: Record<AuditCategory, { label: string; icon: React.ReactNode }> = {
  color: { label: 'Color', icon: <Palette size={10} /> },
  spacing: { label: 'Spacing', icon: <Ruler size={10} /> },
  geometry: { label: 'Geometry', icon: <Circle size={10} /> },
  typography: { label: 'Type', icon: <span className="text-2xs font-bold leading-none">T</span> },
  effects: { label: 'Effects', icon: <span className="text-2xs leading-none">fx</span> },
  layout: { label: 'Layout', icon: <span className="text-2xs leading-none">L</span> },
};

const severityIcons: Record<IssueSeverity, React.ReactNode> = {
  error: <AlertCircle size={12} className="issue-icon-error" />,
  warning: <AlertTriangle size={12} className="issue-icon-warning" />,
  info: <Info size={12} className="issue-icon-info" />,
};

// ─── IssueCard Component ──────────────────────────────────────────────────────

interface IssueCardProps {
  issue: AuditIssue;
  style?: CSSProperties;
}

export const IssueCard = React.memo(function IssueCard({ issue, style }: IssueCardProps) {
  const addIgnoredIssue = useStore((s) => s.addIgnoredIssue);

  const handleFix = useCallback(() => {
    postToPlugin({ type: 'FIX_ISSUE', payload: { issueId: issue.id } });
  }, [issue.id]);

  const handleIgnore = useCallback(() => {
    addIgnoredIssue(issue.id);
    postToPlugin({
      type: 'IGNORE_ISSUE',
      payload: { nodeId: issue.nodeId, ruleId: issue.ruleId },
    });
  }, [issue.id, issue.nodeId, issue.ruleId, addIgnoredIssue]);

  const handleSelect = useCallback(() => {
    postToPlugin({ type: 'SELECT_NODE', payload: { nodeId: issue.nodeId } });
  }, [issue.nodeId]);

  const catMeta = categoryMeta[issue.category];

  return (
    <div
      style={style}
      className="issue-card px-3.5 py-2.5 border-b border-figma-border hover:bg-figma-bg-hover transition-all duration-150 cursor-default group"
    >
      <div className="flex items-start gap-2.5">
        {/* Severity icon */}
        <span className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-figma-bg-secondary">
          {severityIcons[issue.severity]}
        </span>

        <div className="flex-1 min-w-0">
          {/* Top row: message + category badge */}
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-figma-text truncate flex-1 leading-snug">
              {issue.message}
            </p>
            <span className={`issue-category-badge issue-cat-${issue.category}`}>
              {catMeta.icon}
              {catMeta.label}
            </span>
          </div>

          {/* Node path — clickable to select node */}
          <button
            onClick={handleSelect}
            className="text-2xs text-figma-text-tertiary truncate block max-w-full hover:text-figma-brand transition-colors mt-0.5 text-left"
            title={issue.nodePath}
          >
            {issue.nodePath}
          </button>

          {/* Suggestion */}
          {issue.suggestedVariable && (
            <div className="flex items-center gap-1.5 mt-1.5 text-2xs bg-figma-bg-secondary rounded-md px-2 py-1">
              <span className="text-figma-text-tertiary font-mono truncate">
                {String(issue.currentValue)}
              </span>
              <ArrowRight size={10} className="text-figma-text-tertiary shrink-0" />
              <span className="issue-suggestion-name font-semibold font-mono truncate">
                {issue.suggestedVariable.name}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {issue.canAutoFix && (
              <button className="issue-btn-fix" onClick={handleFix}>
                <Wand2 size={10} />
                Fix
              </button>
            )}
            <button className="issue-btn-secondary" onClick={handleIgnore}>
              <EyeOff size={10} />
              Ignore
            </button>
            <button className="issue-btn-secondary" onClick={handleSelect}>
              <MousePointerClick size={10} />
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Row component for react-window v2 List ───────────────────────────────────

export interface IssueRowProps {
  issues: AuditIssue[];
}

export function IssueRow({
  index,
  style,
  issues,
}: {
  ariaAttributes: Record<string, unknown>;
  index: number;
  style: CSSProperties;
} & IssueRowProps) {
  return <IssueCard issue={issues[index]} style={style} />;
}

// ─── Height estimation for react-window ───────────────────────────────────────

/** Estimate item height for variable-size rows */
export function estimateIssueHeight(issue: AuditIssue): number {
  // Base: padding (10+10) + message line (16) + path (14) + buttons (24 + 8 margin) = 82
  const base = 82;
  // Suggestion line adds ~26px (with padding in the bg container)
  const suggestion = issue.suggestedVariable ? 26 : 0;
  return base + suggestion;
}
