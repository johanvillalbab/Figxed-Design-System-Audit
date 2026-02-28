import React, { useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  Palette,
  Ruler,
  Circle,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText as FileTextIcon,
  Copy,
  Zap,
  BookOpen,
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { postToPlugin } from '../hooks/usePluginMessages';
import { QuickActions } from '../components/QuickActions';
import { HealthScore } from '../components/HealthScore';
import { EmptyState } from '../components/EmptyState';
import { IssueCard } from '../components/IssueCard';
import type { AuditCategory } from '../../types/audit';
import type { AdoptionResult } from '../../types/adoption';
import type { IssueSeverity } from '../../types/common';
import {
  exportAuditJSON,
  exportAuditCSV,
  exportAuditMarkdown,
  downloadFile,
  copyToClipboard,
  type ExportContext,
} from '../utils/exporters';

// ─── Metadata ─────────────────────────────────────────────────────────────────

const categoryMeta: Record<AuditCategory, { label: string; icon: React.ReactNode; chipClass: string }> = {
  color: { label: 'Colors', icon: <Palette size={12} />, chipClass: 'chip-color' },
  spacing: { label: 'Spacing', icon: <Ruler size={12} />, chipClass: 'chip-spacing' },
  geometry: { label: 'Geometry', icon: <Circle size={12} />, chipClass: 'chip-geometry' },
  typography: { label: 'Type', icon: <span className="text-xs font-bold">T</span>, chipClass: 'chip-typography' },
  effects: { label: 'Effects', icon: <span className="text-xs">fx</span>, chipClass: 'chip-effects' },
  layout: { label: 'Layout', icon: <span className="text-xs">L</span>, chipClass: 'chip-layout' },
};

const severityMeta: Record<IssueSeverity, { label: string; icon: React.ReactNode; chipClass: string }> = {
  error: { label: 'Error', icon: <AlertCircle size={12} />, chipClass: 'chip-severity-error' },
  warning: { label: 'Warning', icon: <AlertTriangle size={12} />, chipClass: 'chip-severity-warning' },
  info: { label: 'Info', icon: <Info size={12} />, chipClass: 'chip-severity-info' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditTab() {
  const {
    auditResult,
    isAuditing,
    categoryFilters,
    toggleCategoryFilter,
    severityFilters,
    toggleSeverityFilter,
    getFilteredIssues,
    lastAuditScope,
    setLastAuditScope,
    setIsAuditing,
    fixedIssueIds,
    ignoredIssueIds,
    showFixed,
    toggleShowFixed,
    loadedLibrary,
    adoptionResult,
  } = useStore();

  const filteredIssues = getFilteredIssues();

  // ─── Health score ─────────────────────────────────────────────────────
  const healthScore = auditResult
    ? auditResult.stats.processedNodes > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((auditResult.stats.processedNodes - auditResult.stats.nodesWithIssues) /
                auditResult.stats.processedNodes) *
                100
            )
          )
        )
      : 100
    : null;

  // ─── Stats ────────────────────────────────────────────────────────────
  const resolvedCount = fixedIssueIds.length + ignoredIssueIds.length;

  // ─── Handlers ─────────────────────────────────────────────────────────
  const selectedPageIds = useStore((s) => s.selectedPageIds);
  const reAudit = useCallback(() => {
    const scope = lastAuditScope ?? 'page';
    setIsAuditing(true);
    postToPlugin({ type: 'START_AUDIT', payload: { scope, pageIds: scope === 'pages' ? selectedPageIds : undefined } });
  }, [lastAuditScope, setIsAuditing, selectedPageIds]);

  // ─── Loading state ────────────────────────────────────────────────────
  if (isAuditing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 spinner" />
        <p className="text-xs text-figma-text-secondary font-medium">Running audit...</p>
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────
  if (!auditResult) {
    return (
      <div className="p-3.5 space-y-4">
        <HealthScore score={null} />
        <QuickActions />
        <EmptyState
          icon={<Search size={28} />}
          title="No audit results yet"
          description="Run an audit on your selection, page, or entire file to detect design issues."
        />
      </div>
    );
  }

  // ─── Results state ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ─── Scrollable content ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ─── Score + Stats ───────────────────────────────────────────── */}
        <div className="p-3.5 space-y-3">
          {/* Health + Adoption scores side by side */}
          <div className={`grid gap-3 ${adoptionResult ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <HealthScore score={healthScore} />
            {adoptionResult && (
              <AdoptionScoreCard result={adoptionResult} />
            )}
          </div>

          {/* Library context banner */}
          {loadedLibrary && (
            <motion.div
              className="flex items-center gap-2 text-2xs px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-component) 8%, var(--figma-color-bg))',
                color: 'var(--figma-color-bg-component)',
              }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            >
              <BookOpen size={12} className="shrink-0" />
              <span className="flex-1 min-w-0">
                Recommendations based on <strong className="font-semibold">{loadedLibrary.fileName}</strong>
                <span className="text-figma-text-tertiary ml-1">
                  — {loadedLibrary.summary.totalVariables} vars, {loadedLibrary.summary.totalComponents} comp, {loadedLibrary.summary.totalStyles} styles
                </span>
              </span>
            </motion.div>
          )}

          {/* Adoption breakdown */}
          {adoptionResult && adoptionResult.categories.length > 0 && (
            <AdoptionBreakdown result={adoptionResult} />
          )}

          {/* Quick stats bar */}
          <motion.div
            className="flex items-center gap-3 text-2xs text-figma-text-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {auditResult.stats.duration < 1000
                ? `${auditResult.stats.duration}ms`
                : `${(auditResult.stats.duration / 1000).toFixed(1)}s`}
            </span>
            <span className="w-px h-3 bg-figma-border" />
            <span>{auditResult.stats.processedNodes.toLocaleString()} nodes</span>
            <span className="w-px h-3 bg-figma-border" />
            <span className="font-semibold text-figma-text">{auditResult.summary.totalIssues} issues</span>
            {resolvedCount > 0 && (
              <>
                <span className="w-px h-3 bg-figma-border" />
                <span className="issue-suggestion-name font-semibold">{resolvedCount} resolved</span>
              </>
            )}
          </motion.div>

          {/* ─── Filters: Category ───────────────────────────────────── */}
          <div>
            <p className="section-label mb-2">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(categoryMeta) as AuditCategory[]).map((cat) => {
                const meta = categoryMeta[cat];
                const count = auditResult.summary.byCategory[cat] || 0;
                if (count === 0) return null;
                return (
                  <motion.button
                    key={cat}
                    onClick={() => toggleCategoryFilter(cat)}
                    data-active={categoryFilters[cat]}
                    className={`filter-chip ${meta.chipClass}`}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  >
                    {meta.icon}
                    {meta.label} {count}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ─── Filters: Severity ───────────────────────────────────── */}
          <div>
            <p className="section-label mb-2">Severity</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(severityMeta) as IssueSeverity[]).map((sev) => {
                const meta = severityMeta[sev];
                const count = auditResult.summary.bySeverity[sev] || 0;
                if (count === 0) return null;
                return (
                  <motion.button
                    key={sev}
                    onClick={() => toggleSeverityFilter(sev)}
                    data-active={severityFilters[sev]}
                    className={`filter-chip ${meta.chipClass}`}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  >
                    {meta.icon}
                    {meta.label} {count}
                  </motion.button>
                );
              })}

              {/* Show/hide resolved toggle */}
              {resolvedCount > 0 && (
                <motion.button
                  onClick={toggleShowFixed}
                  className="filter-chip bg-figma-bg-secondary text-figma-text-tertiary"
                  data-active={showFixed}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                >
                  {showFixed ? <Eye size={10} /> : <EyeOff size={10} />}
                  {showFixed ? 'Showing' : 'Hiding'} resolved
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Issue list ──────────────────────────────────────────────── */}
        <div className="border-t border-figma-border">
          {filteredIssues.length === 0 ? (
            <EmptyState
              icon={<Search size={24} />}
              title="No issues match filters"
              description="Try adjusting your category or severity filters."
            />
          ) : (
            filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))
          )}
        </div>
      </div>

      {/* ─── Footer actions (fixed) ──────────────────────────────────── */}
      <div className="shrink-0 p-3.5 border-t border-figma-border space-y-2.5 bg-figma-bg">
        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={() =>
            postToPlugin({ type: 'FIX_ALL', payload: { category: 'all' } })
          }
          disabled={auditResult.summary.autoFixable === 0}
        >
          <Zap size={14} />
          Fix All Issues ({auditResult.summary.autoFixable})
        </button>
        <div className="flex gap-2">
          <ExportMenu auditResult={auditResult} />
          <button
            className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
            onClick={reAudit}
          >
            <RefreshCw size={12} />
            Re-Audit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Adoption Score Card ──────────────────────────────────────────────────────

function AdoptionCircularProgress({ rate, color, size = 80 }: { rate: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(0);
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(rate), 200);
    return () => clearTimeout(timer);
  }, [rate]);

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
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xl font-bold score-value"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          {Math.round(rate)}%
        </motion.span>
      </div>
    </div>
  );
}

function AdoptionScoreCard({ result }: { result: AdoptionResult }) {
  const rate = result.metrics.adoptionRate;

  const info = rate >= 75
    ? { label: 'Good', color: 'var(--figma-color-bg-success)' }
    : rate >= 50
      ? { label: 'Moderate', color: 'var(--figma-color-bg-warning)' }
      : { label: 'Low', color: 'var(--figma-color-bg-danger)' };

  return (
    <motion.div
      className="card border text-center py-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
    >
      <p className="section-label mb-2 truncate px-2">Adoption</p>
      <div className="flex flex-col items-center gap-2">
        <AdoptionCircularProgress rate={rate} color={info.color} />
        <motion.span
          className="badge score-badge"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          {info.label}
        </motion.span>
      </div>
    </motion.div>
  );
}

// ─── Adoption Breakdown ───────────────────────────────────────────────────────

const categoryIcon: Record<string, React.ReactNode> = {
  Components: <Palette size={11} />,
  Colors: <Palette size={11} />,
  Spacing: <Ruler size={11} />,
  'Text Styles': <span className="text-2xs font-bold leading-none">T</span>,
  Radius: <Circle size={11} />,
};

function AdoptionBreakdown({ result }: { result: AdoptionResult }) {
  const totalChecked = result.categories.reduce((s, c) => s + c.total, 0);
  const totalAdopted = result.categories.reduce((s, c) => s + c.adopted, 0);

  return (
    <motion.div
      className="rounded-lg border border-figma-border bg-figma-bg p-3 space-y-2.5"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
    >
      <p className="section-label">Adoption Breakdown</p>

      <div className="space-y-2">
        {result.categories.map((cat) => {
          const pct = cat.rate;
          const color =
            pct >= 75
              ? 'var(--figma-color-bg-success)'
              : pct >= 50
                ? 'var(--figma-color-bg-warning)'
                : 'var(--figma-color-bg-danger)';

          return (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-2xs">
                <span className="flex items-center gap-1.5 text-figma-text font-medium">
                  {categoryIcon[cat.name] ?? <Circle size={11} />}
                  {cat.name}
                </span>
                <span className="text-figma-text-secondary">
                  <strong className="font-semibold text-figma-text">{cat.adopted}</strong>/{cat.total} adopted
                  <span className="ml-1.5 font-semibold" style={{ color }}>{pct}%</span>
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--figma-color-bg-tertiary)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.25 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary explanation */}
      <div
        className="text-2xs leading-relaxed px-2.5 py-2 rounded-md"
        style={{
          backgroundColor: 'var(--figma-color-bg-secondary)',
          color: 'var(--figma-color-text-secondary)',
        }}
      >
        Overall <strong className="font-semibold text-figma-text">{result.metrics.adoptionRate}%</strong> adoption
        {' '}= {totalAdopted} of {totalChecked} design properties use DS tokens.
        {result.categories.map((cat, i) => (
          <span key={cat.name}>
            {i === 0 ? ' ' : ''}
            {cat.name}: {cat.adopted}/{cat.total} ({cat.rate}%){i < result.categories.length - 1 ? ' · ' : '.'}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Export Menu ───────────────────────────────────────────────────────────────

function ExportMenu({ auditResult }: { auditResult: import('../../types/audit').AuditResult }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setNotification, lastAuditScope, fileName, pageName, loadedLibrary, adoptionResult, selectionCount } = useStore();

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const buildContext = (): ExportContext => ({
    scope: lastAuditScope,
    fileName: fileName || undefined,
    pageName: pageName || undefined,
    libraryName: loadedLibrary?.fileName ?? undefined,
    loadedLibrary: loadedLibrary ?? undefined,
    adoptionResult: adoptionResult ?? undefined,
    selectionCount,
  });

  const handleExport = (format: 'json' | 'csv' | 'md' | 'copy') => {
    setOpen(false);
    const timestamp = new Date().toISOString().slice(0, 10);
    const ctx = buildContext();

    switch (format) {
      case 'json': {
        const json = exportAuditJSON(auditResult, ctx);
        downloadFile(json, `figxed-audit-${timestamp}.json`, 'application/json');
        break;
      }
      case 'csv': {
        const csv = exportAuditCSV(auditResult, ctx);
        downloadFile(csv, `figxed-audit-${timestamp}.csv`, 'text/csv');
        break;
      }
      case 'md': {
        const md = exportAuditMarkdown(auditResult, ctx);
        downloadFile(md, `figxed-audit-${timestamp}.md`, 'text/markdown');
        break;
      }
      case 'copy': {
        const md = exportAuditMarkdown(auditResult, ctx);
        copyToClipboard(md).then((ok) => {
          setNotification({
            message: ok ? 'Report copied to clipboard' : 'Copy failed',
            type: ok ? 'success' : 'error',
          });
        });
        break;
      }
    }
  };

  return (
    <div className="relative flex-1" ref={menuRef}>
      <button
        className="btn-secondary w-full flex items-center justify-center gap-1.5"
        onClick={() => setOpen(!open)}
      >
        <Download size={12} />
        Export
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-0 mb-1.5 w-full bg-figma-bg border border-figma-border rounded-xl z-10 py-1.5 overflow-hidden"
            style={{}}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            <button className="export-menu-item" onClick={() => handleExport('json')}>
              <FileJson size={13} /> JSON
            </button>
            <button className="export-menu-item" onClick={() => handleExport('csv')}>
              <FileSpreadsheet size={13} /> CSV
            </button>
            <button className="export-menu-item" onClick={() => handleExport('md')}>
              <FileTextIcon size={13} /> Markdown
            </button>
            <div className="border-t border-figma-border my-1" />
            <button className="export-menu-item" onClick={() => handleExport('copy')}>
              <Copy size={13} /> Copy to clipboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
