import React, { useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Layers,
  Paintbrush,
  Braces,
  Upload,
  Trash2,
  CheckCircle2,
  BookOpen,
  Palette,
  Hash,
  Type,
  ToggleLeft,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Circle,
  Droplets,
  Sparkles,
  Grid3X3,
  Search,
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { postToPlugin } from '../hooks/usePluginMessages';
import { EmptyState } from '../components/EmptyState';
import type { LoadedLibraryData } from '../../types/adoption';

// ─── Source of Truth Library Section ──────────────────────────────────────────

function LoadLibrarySection() {
  const { loadedLibrary, isLoadingLibrary, setIsLoadingLibrary } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const prevLoadedAt = useRef(loadedLibrary?.loadedAt);

  // Reset to expanded when a fresh library load happens
  useEffect(() => {
    if (loadedLibrary?.loadedAt && loadedLibrary.loadedAt !== prevLoadedAt.current) {
      setCollapsed(false);
      prevLoadedAt.current = loadedLibrary.loadedAt;
    }
  }, [loadedLibrary?.loadedAt]);

  const handleLoad = useCallback(() => {
    setIsLoadingLibrary(true);
    postToPlugin({ type: 'LOAD_LIBRARY_FROM_FILE' });
  }, [setIsLoadingLibrary]);

  const handleUnload = useCallback(() => {
    postToPlugin({ type: 'UNLOAD_LIBRARY' });
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoadingLibrary(true);
    postToPlugin({ type: 'REFRESH_LOADED_LIBRARY' });
  }, [setIsLoadingLibrary]);

  if (isLoadingLibrary) {
    return (
      <motion.div
        className="card text-center py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-6 h-6 spinner mx-auto mb-3" />
        <p className="text-xs text-figma-text-secondary font-medium">Scanning file...</p>
        <p className="text-2xs text-figma-text-tertiary mt-1">Loading variables, components & styles</p>
      </motion.div>
    );
  }

  if (loadedLibrary) {
    return (
      <motion.div layout transition={{ layout: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } }}>
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              <CollapsedLibraryRow
                library={loadedLibrary}
                onRemove={handleUnload}
                onExpand={() => setCollapsed(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              <ExpandedLibrarySummary
                library={loadedLibrary}
                onRefresh={handleRefresh}
                onReload={handleLoad}
                onRemove={handleUnload}
                onCollapse={() => setCollapsed(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="card relative overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, var(--figma-color-bg-component), var(--figma-color-bg-brand))' }} />
      <div className="flex items-start gap-3 pt-1">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-component) 12%, var(--figma-color-bg))' }}>
          <BookOpen size={16} style={{ color: 'var(--figma-color-bg-component)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-figma-text mb-0.5">Source of Truth</p>
          <p className="text-2xs text-figma-text-tertiary leading-relaxed">
            Open your published library file and load all its variables, components, and styles to use as reference.
          </p>
          <button
            className="mt-2.5 inline-flex items-center gap-1.5 text-2xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            style={{ backgroundColor: 'var(--figma-color-bg-brand)', color: '#fff' }}
            onClick={handleLoad}
          >
            <Upload size={11} />
            Load from this file
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Collapsed Library Row ────────────────────────────────────────────────────

function CollapsedLibraryRow({
  library,
  onRemove,
  onExpand,
}: {
  library: LoadedLibraryData;
  onRemove: () => void;
  onExpand: () => void;
}) {
  const { summary } = library;

  return (
    <div className="card relative overflow-hidden flex items-center gap-2 py-2 px-3">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, var(--figma-color-bg-success), var(--figma-color-bg-component))' }} />
      <CheckCircle2 size={14} className="shrink-0" style={{ color: 'var(--figma-color-bg-success)' }} />
      <span className="text-xs font-semibold text-figma-text truncate flex-1">{library.fileName}</span>

      <div className="flex items-center gap-1.5 shrink-0">
        <MiniStat icon={<Braces size={9} />} value={summary.totalVariables} />
        <MiniStat icon={<Layers size={9} />} value={summary.totalComponents} />
        <MiniStat icon={<Paintbrush size={9} />} value={summary.totalStyles} />
      </div>

      <div className="flex items-center gap-0.5 ml-1 shrink-0">
        <button
          className="text-figma-text-tertiary hover:text-figma-text-danger cursor-pointer transition-colors p-1 rounded-md hover:bg-figma-bg-hover"
          onClick={onRemove}
          title="Remove library"
        >
          <Trash2 size={12} />
        </button>
        <button
          className="text-figma-text-tertiary hover:text-figma-text cursor-pointer transition-colors p-1 rounded-md hover:bg-figma-bg-hover"
          onClick={onExpand}
          title="Expand library details"
        >
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
}

function MiniStat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-2xs text-figma-text-tertiary tabular-nums px-1.5 py-0.5 rounded-md bg-figma-bg-secondary">
      {icon}
      <span className="font-semibold">{value}</span>
    </span>
  );
}

// ─── Expanded Library Summary ─────────────────────────────────────────────────

function ExpandedLibrarySummary({
  library,
  onRefresh,
  onReload,
  onRemove,
  onCollapse,
}: {
  library: LoadedLibraryData;
  onRefresh: () => void;
  onReload: () => void;
  onRemove: () => void;
  onCollapse: () => void;
}) {
  const { summary } = library;
  const loadedAgo = getTimeAgo(library.loadedAt);

  const variableBreakdown: { icon: React.ReactNode; label: string; count: number; color: string }[] = [];
  if (summary.colorVariables > 0) variableBreakdown.push({ icon: <Palette size={9} />, label: 'colors', count: summary.colorVariables, color: 'var(--figma-color-bg-danger)' });
  if (summary.floatVariables > 0) variableBreakdown.push({ icon: <Hash size={9} />, label: 'numbers', count: summary.floatVariables, color: 'var(--figma-color-bg-success)' });
  if (summary.stringVariables > 0) variableBreakdown.push({ icon: <Type size={9} />, label: 'strings', count: summary.stringVariables, color: 'var(--figma-color-bg-warning)' });
  if (summary.booleanVariables > 0) variableBreakdown.push({ icon: <ToggleLeft size={9} />, label: 'booleans', count: summary.booleanVariables, color: 'var(--figma-color-bg-brand)' });

  const styleBreakdown: { label: string; count: number }[] = [];
  if (summary.paintStyles > 0) styleBreakdown.push({ label: 'paint', count: summary.paintStyles });
  if (summary.textStyles > 0) styleBreakdown.push({ label: 'text', count: summary.textStyles });
  if (summary.effectStyles > 0) styleBreakdown.push({ label: 'effect', count: summary.effectStyles });
  if (summary.gridStyles > 0) styleBreakdown.push({ label: 'grid', count: summary.gridStyles });

  return (
    <div className="card relative overflow-hidden p-0">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, var(--figma-color-bg-success), var(--figma-color-bg-component))' }} />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-success) 12%, var(--figma-color-bg))' }}>
          <CheckCircle2 size={15} style={{ color: 'var(--figma-color-bg-success)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-figma-text truncate block">{library.fileName}</span>
          <p className="text-2xs text-figma-text-tertiary">Loaded {loadedAgo}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            className="text-figma-text-tertiary hover:text-figma-text-danger cursor-pointer transition-colors p-1 rounded-md hover:bg-figma-bg-hover"
            onClick={onRemove}
            title="Remove library"
          >
            <Trash2 size={12} />
          </button>
          <button
            className="text-figma-text-tertiary hover:text-figma-text cursor-pointer transition-colors p-1 rounded-md hover:bg-figma-bg-hover"
            onClick={onCollapse}
            title="Collapse library"
          >
            <ChevronUp size={12} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px mx-3.5 mb-2.5 rounded-lg overflow-hidden border border-figma-border">
        <StatCell icon={<Braces size={12} />} value={summary.totalVariables} label="Variables" />
        <StatCell icon={<Layers size={12} />} value={summary.totalComponents} label="Components" />
        <StatCell icon={<Paintbrush size={12} />} value={summary.totalStyles} label="Styles" />
      </div>

      {/* Variable breakdown */}
      {variableBreakdown.length > 0 && (
        <div className="flex items-center gap-1.5 px-3.5 pb-2.5 flex-wrap">
          {variableBreakdown.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${item.color} 8%, var(--figma-color-bg))`, color: item.color }}>
              {item.icon} <span className="font-semibold">{item.count}</span> {item.label}
            </span>
          ))}
        </div>
      )}

      {/* Style breakdown */}
      {styleBreakdown.length > 0 && (
        <div className="flex items-center gap-1.5 px-3.5 pb-2.5 flex-wrap">
          {styleBreakdown.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-component) 8%, var(--figma-color-bg))', color: 'var(--figma-color-bg-component)' }}>
              <Paintbrush size={9} /> <span className="font-semibold">{item.count}</span> {item.label}
            </span>
          ))}
        </div>
      )}

      {/* Collections list */}
      {library.collections.length > 0 && (
        <div className="border-t border-figma-border px-3.5 py-2">
          <p className="text-2xs font-semibold text-figma-text-tertiary uppercase tracking-wider mb-1.5">
            {library.collections.length} Collection{library.collections.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            {library.collections.map((col) => (
              <div key={col.key} className="flex items-center justify-between text-2xs">
                <span className="text-figma-text-secondary truncate">{col.name}</span>
                <span className="text-figma-text-tertiary tabular-nums shrink-0 ml-2">
                  {col.variableCount} vars{col.modes.length > 1 && ` · ${col.modes.length} modes`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="border-t border-figma-border flex">
        <button className="flex-1 flex items-center justify-center gap-1.5 text-2xs font-medium text-figma-text-secondary hover:bg-figma-bg-hover py-2 cursor-pointer transition-colors" onClick={onRefresh} title="Re-scan the current file">
          <RefreshCw size={10} /> Refresh
        </button>
        <div className="w-px bg-figma-border" />
        <button className="flex-1 flex items-center justify-center gap-1.5 text-2xs font-medium text-figma-text-secondary hover:bg-figma-bg-hover py-2 cursor-pointer transition-colors" onClick={onReload} title="Re-load from the current file">
          <Upload size={10} /> Re-load from file
        </button>
      </div>
    </div>
  );
}

function StatCell({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center py-2.5 bg-figma-bg-secondary">
      <div className="text-figma-icon-secondary mb-1">{icon}</div>
      <span className="text-sm font-bold text-figma-text tabular-nums">{value}</span>
      <span className="text-2xs text-figma-text-tertiary">{label}</span>
    </div>
  );
}

// ─── Library Contents List ────────────────────────────────────────────────────

interface LibCategoryDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  getItems: (lib: LoadedLibraryData) => { name: string; detail?: string }[];
}

const libCategories: LibCategoryDef[] = [
  {
    id: 'components',
    label: 'Components',
    icon: <Layers size={13} />,
    color: 'var(--figma-color-bg-component)',
    getItems: (lib) =>
      lib.components.map((c) => ({
        name: c.name,
        detail: c.description || undefined,
      })),
  },
  {
    id: 'color-vars',
    label: 'Color Variables',
    icon: <Palette size={13} />,
    color: 'var(--figma-color-bg-danger)',
    getItems: (lib) =>
      lib.variables
        .filter((v) => v.resolvedType === 'COLOR')
        .map((v) => ({ name: v.name, detail: v.collectionName })),
  },
  {
    id: 'number-vars',
    label: 'Number Variables',
    icon: <Hash size={13} />,
    color: 'var(--figma-color-bg-success)',
    getItems: (lib) =>
      lib.variables
        .filter((v) => v.resolvedType === 'FLOAT')
        .map((v) => ({ name: v.name, detail: v.collectionName })),
  },
  {
    id: 'string-vars',
    label: 'String Variables',
    icon: <Type size={13} />,
    color: 'var(--figma-color-bg-warning)',
    getItems: (lib) =>
      lib.variables
        .filter((v) => v.resolvedType === 'STRING')
        .map((v) => ({ name: v.name, detail: v.collectionName })),
  },
  {
    id: 'boolean-vars',
    label: 'Boolean Variables',
    icon: <ToggleLeft size={13} />,
    color: 'var(--figma-color-bg-brand)',
    getItems: (lib) =>
      lib.variables
        .filter((v) => v.resolvedType === 'BOOLEAN')
        .map((v) => ({ name: v.name, detail: v.collectionName })),
  },
  {
    id: 'paint-styles',
    label: 'Paint Styles',
    icon: <Droplets size={13} />,
    color: 'var(--figma-color-bg-danger)',
    getItems: (lib) =>
      lib.styles
        .filter((s) => s.styleType === 'PAINT')
        .map((s) => ({ name: s.name })),
  },
  {
    id: 'text-styles',
    label: 'Text Styles',
    icon: <Type size={13} />,
    color: 'var(--figma-color-bg-component)',
    getItems: (lib) =>
      lib.styles
        .filter((s) => s.styleType === 'TEXT')
        .map((s) => ({ name: s.name })),
  },
  {
    id: 'effect-styles',
    label: 'Effect Styles',
    icon: <Sparkles size={13} />,
    color: 'var(--figma-color-bg-warning)',
    getItems: (lib) =>
      lib.styles
        .filter((s) => s.styleType === 'EFFECT')
        .map((s) => ({ name: s.name })),
  },
  {
    id: 'grid-styles',
    label: 'Grid Styles',
    icon: <Grid3X3 size={13} />,
    color: 'var(--figma-color-bg-brand)',
    getItems: (lib) =>
      lib.styles
        .filter((s) => s.styleType === 'GRID')
        .map((s) => ({ name: s.name })),
  },
];

function LibraryContentsList({ library }: { library: LoadedLibraryData }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const populated = libCategories
    .map((cat) => ({ ...cat, items: cat.getItems(library) }))
    .filter((cat) => cat.items.length > 0);

  if (populated.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="section-label">Library Contents</p>

      {populated.map((cat) => {
        const isOpen = expandedId === cat.id;

        return (
          <motion.div
            key={cat.id}
            className="rounded-lg border border-figma-border overflow-hidden bg-figma-bg"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-figma-bg-hover transition-colors"
              onClick={() => toggle(cat.id)}
            >
              <span className="shrink-0" style={{ color: cat.color }}>{cat.icon}</span>
              <span className="flex-1 text-left text-xs font-semibold text-figma-text">{cat.label}</span>
              <span
                className="text-2xs font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                style={{
                  backgroundColor: `color-mix(in srgb, ${cat.color} 10%, var(--figma-color-bg))`,
                  color: cat.color,
                }}
              >
                {cat.items.length}
              </span>
              <motion.span
                className="text-figma-text-tertiary shrink-0"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              >
                <ChevronDown size={12} />
              </motion.span>
            </button>

            {/* Expanded items */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-figma-border max-h-52 overflow-y-auto">
                    {cat.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-2xs py-1.5 px-3 hover:bg-figma-bg-secondary transition-colors"
                      >
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-figma-text truncate flex-1">{item.name}</span>
                        {item.detail && (
                          <span className="text-figma-text-tertiary truncate max-w-[40%] text-right">{item.detail}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdoptionTab() {
  const { loadedLibrary, isLoadingLibrary, setActiveTab, detectedLibraries } = useStore();
  const showAuditButton = !!loadedLibrary || detectedLibraries.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
        <LoadLibrarySection />

        {loadedLibrary && (
          <LibraryContentsList library={loadedLibrary} />
        )}

        {!loadedLibrary && !isLoadingLibrary && (
          <EmptyState
            icon={<BarChart3 size={28} />}
            title="No library loaded"
            description="Open your design system library file and load it to use as the source of truth for adoption auditing."
          />
        )}
      </div>

      {showAuditButton && (
        <div className="shrink-0 p-3.5 border-t border-figma-border bg-figma-bg">
          <button
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={() => setActiveTab('audit')}
          >
            <Search size={14} />
            Audit
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
