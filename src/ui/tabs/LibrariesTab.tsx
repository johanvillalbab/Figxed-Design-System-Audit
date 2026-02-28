import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Package,
  Hash,
  ToggleLeft,
  Type,
  Paintbrush,
  ListTree,
  MousePointerClick,
  Clock,
  RefreshCw,
  FileText,
  Files,
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { postToPlugin } from '../hooks/usePluginMessages';
import { EmptyState } from '../components/EmptyState';
import { PagePicker } from '../components/PagePicker';
import type { AuditScope } from '../../types/common';
import type {
  ScannedLibrary,
  ScannedComponent,
  ScannedComponentProperty,
} from '../../types/adoption';

// ─── Property type metadata ──────────────────────────────────────────────────

const PROPERTY_TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  VARIANT: { icon: <SlidersHorizontal size={10} />, color: 'var(--figma-color-bg-component)', label: 'Variant' },
  TEXT: { icon: <Type size={10} />, color: 'var(--figma-color-bg-warning)', label: 'Text' },
  BOOLEAN: { icon: <ToggleLeft size={10} />, color: 'var(--figma-color-bg-brand)', label: 'Boolean' },
  INSTANCE_SWAP: { icon: <Layers size={10} />, color: 'var(--figma-color-bg-success)', label: 'Instance' },
};

function getPropertyMeta(type: string) {
  return PROPERTY_TYPE_META[type] ?? {
    icon: <Hash size={10} />,
    color: 'var(--figma-color-text-secondary)',
    label: type,
  };
}

// ─── Animation variants ──────────────────────────────────────────────────────

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

// ─── Property Row ────────────────────────────────────────────────────────────

function PropertyRow({ property }: { property: ScannedComponentProperty }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getPropertyMeta(property.type);
  const hasValues = property.values.length > 0;

  return (
    <div className="border-b border-figma-border last:border-b-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-figma-bg-hover transition-colors cursor-pointer"
        onClick={() => hasValues && setExpanded((p) => !p)}
        disabled={!hasValues}
      >
        <span style={{ color: meta.color }}>{meta.icon}</span>
        <span className="text-2xs text-figma-text truncate flex-1 font-medium">
          {property.name}
        </span>
        <span
          className="text-2xs font-semibold px-1.5 py-px rounded-md shrink-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${meta.color} 10%, var(--figma-color-bg))`,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
        {hasValues && (
          <span className="text-figma-text-tertiary shrink-0">
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && hasValues && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1 px-3 pb-2 pl-8">
              {property.values.map((val) => (
                <span
                  key={val}
                  className="text-2xs px-1.5 py-0.5 rounded-md bg-figma-bg-secondary text-figma-text-secondary truncate max-w-[140px]"
                  title={val}
                >
                  {val}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Component Card ──────────────────────────────────────────────────────────

function ComponentCard({ component }: { component: ScannedComponent }) {
  const [expanded, setExpanded] = useState(false);
  const [locateIdx, setLocateIdx] = useState(0);
  const hasProps = component.properties.length > 0;
  const hasInstances = component.instanceNodeIds.length > 0;

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasInstances) return;
    const nodeId = component.instanceNodeIds[locateIdx % component.instanceNodeIds.length];
    postToPlugin({ type: 'SELECT_NODE', payload: { nodeId } });
    setLocateIdx((i) => i + 1);
  };

  return (
    <div className="issue-card px-3.5 py-2.5 border-b border-figma-border hover:bg-figma-bg-hover transition-all duration-150 cursor-default group">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-figma-bg-secondary">
          <Layers size={12} style={{ color: 'var(--figma-color-bg-component)' }} />
        </span>

        <div className="flex-1 min-w-0">
          {/* Top row: name + instance count */}
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-figma-text truncate flex-1 leading-snug">
              {component.name}
            </p>
            <span className="text-2xs text-figma-text-tertiary tabular-nums shrink-0">
              {component.instanceCount}x
            </span>
            {hasProps && (
              <span
                className="text-2xs font-bold px-1.5 py-0.5 rounded-md tabular-nums shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-component) 10%, var(--figma-color-bg))',
                  color: 'var(--figma-color-bg-component)',
                }}
              >
                {component.properties.length} prop{component.properties.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Library name */}
          {component.libraryName && (
            <span className="text-2xs text-figma-text-tertiary truncate block mt-0.5">
              {component.libraryName}
            </span>
          )}

          {/* Properties (collapsible) */}
          {hasProps && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="text-2xs text-figma-text-tertiary hover:text-figma-brand transition-colors mt-1 flex items-center gap-1 cursor-pointer"
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {expanded ? 'Hide' : 'Show'} properties
            </button>
          )}

          <AnimatePresence>
            {expanded && hasProps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden mt-1.5"
              >
                <div className="rounded-lg border border-figma-border overflow-hidden">
                  {component.properties.map((prop) => (
                    <PropertyRow key={prop.name} property={prop} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions (visible on hover, like IssueCard) */}
          <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {hasInstances && (
              <button
                className="issue-btn-secondary"
                onClick={handleLocate}
                title={component.instanceNodeIds.length > 1 ? 'Click again to cycle through instances' : 'Select instance on canvas'}
              >
                <MousePointerClick size={10} />
                Locate
                {component.instanceNodeIds.length > 1 && (
                  <span className="opacity-60 text-2xs">
                    ({(locateIdx % component.instanceNodeIds.length) + 1}/{component.instanceNodeIds.length}{component.instanceCount > component.instanceNodeIds.length ? '+' : ''})
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Library Section (replaces card-style with flat list like issue categories) ─

function LibrarySection({ library }: { library: ScannedLibrary }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      {/* Library header — like a category filter section */}
      <button
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-figma-bg-hover transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-component) 12%, var(--figma-color-bg))' }}
        >
          <Package size={13} style={{ color: 'var(--figma-color-bg-component)' }} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <span className="text-xs font-semibold text-figma-text truncate block">
            {library.name}
          </span>
          <span className="text-2xs text-figma-text-tertiary">
            {library.components.length} component{library.components.length !== 1 ? 's' : ''}
            {' · '}
            {library.totalInstances} instance{library.totalInstances !== 1 ? 's' : ''}
          </span>
        </div>
        <motion.span
          className="text-figma-text-tertiary shrink-0"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>

      {/* Components list — flat list like IssueCards */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            {library.components.map((comp) => (
              <ComponentCard key={comp.key} component={comp} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Scan Summary ────────────────────────────────────────────────────────────

function ScanSummary({
  result,
}: {
  result: NonNullable<ReturnType<typeof useStore.getState>['libraryScanResult']>;
}) {
  const { scanInfo, libraries } = result;
  const totalComponents = libraries.reduce((s, l) => s + l.components.length, 0);
  const totalProps = libraries.reduce(
    (s, l) => s + l.components.reduce((cs, c) => cs + c.properties.length, 0),
    0,
  );

  return (
    <div className="grid grid-cols-4 gap-px rounded-lg overflow-hidden border border-figma-border">
      <SummaryCell label="Libraries" value={libraries.length} />
      <SummaryCell label="Components" value={totalComponents} />
      <SummaryCell label="Instances" value={scanInfo.totalInstances} />
      <SummaryCell label="Properties" value={totalProps} />
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center py-2.5 bg-figma-bg-secondary">
      <span className="text-sm font-bold text-figma-text tabular-nums">{value}</span>
      <span className="text-2xs text-figma-text-tertiary">{label}</span>
    </div>
  );
}

// ─── Search Filter ───────────────────────────────────────────────────────────

function useFilteredLibraries(
  libraries: ScannedLibrary[],
  query: string,
): ScannedLibrary[] {
  if (!query.trim()) return libraries;
  const q = query.toLowerCase();
  return libraries
    .map((lib) => {
      const matchingComponents = lib.components.filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        return c.properties.some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.values.some((v) => v.toLowerCase().includes(q)),
        );
      });
      if (lib.name.toLowerCase().includes(q)) return lib;
      if (matchingComponents.length === 0) return null;
      return { ...lib, components: matchingComponents };
    })
    .filter(Boolean) as ScannedLibrary[];
}

// ─── Quick Actions for Libraries ─────────────────────────────────────────────

function LibraryQuickActions({
  onScan,
  onScanPages,
  selectionCount,
}: {
  onScan: (scope: AuditScope) => void;
  onScanPages: () => void;
  selectionCount: number;
}) {
  return (
    <motion.div
      className="space-y-2.5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.p className="section-label" variants={itemVariants}>
        Scan Libraries
      </motion.p>

      <motion.button
        className="btn-primary w-full flex items-center justify-center gap-2"
        onClick={() => onScan('selection')}
        disabled={selectionCount === 0}
        variants={itemVariants}
      >
        <Search size={14} />
        Scan Selection
        {selectionCount > 0 && (
          <span className="text-2xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded-full">
            {selectionCount}
          </span>
        )}
      </motion.button>

      <motion.div className="flex gap-2" variants={itemVariants}>
        <button
          className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
          onClick={() => onScan('page')}
        >
          <FileText size={13} />
          Scan Page
        </button>
        <button
          className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
          onClick={onScanPages}
        >
          <Files size={13} />
          Scan File
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LibrariesTab() {
  const {
    libraryScanResult,
    isScanningLibraries,
    setIsScanningLibraries,
    selectionCount,
  } = useStore();

  const [lastScanScope, setLastScanScope] = useState<AuditScope>('page');
  const [lastPageIds, setLastPageIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPagePicker, setShowPagePicker] = useState(false);

  const handleScan = useCallback((scope: AuditScope, pageIds?: string[]) => {
    setLastScanScope(scope);
    if (pageIds) setLastPageIds(pageIds);
    setIsScanningLibraries(true);
    postToPlugin({ type: 'SCAN_LIBRARIES', payload: { scope, pageIds } });
  }, [setIsScanningLibraries]);

  const handleScanPages = useCallback(() => {
    postToPlugin({ type: 'GET_FILE_PAGES' });
    setShowPagePicker(true);
  }, []);

  const handlePagePickerConfirm = useCallback((pageIds: string[]) => {
    setShowPagePicker(false);
    handleScan('pages', pageIds);
  }, [handleScan]);

  const reScan = useCallback(() => {
    setIsScanningLibraries(true);
    postToPlugin({ type: 'SCAN_LIBRARIES', payload: { scope: lastScanScope, pageIds: lastScanScope === 'pages' ? lastPageIds : undefined } });
  }, [lastScanScope, lastPageIds, setIsScanningLibraries]);

  const filteredLibraries = useFilteredLibraries(
    libraryScanResult?.libraries ?? [],
    searchQuery,
  );

  const hasResults = libraryScanResult && libraryScanResult.libraries.length > 0;

  // ─── Loading state ─────────────────────────────────────────────────
  if (isScanningLibraries) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 spinner" />
        <p className="text-xs text-figma-text-secondary font-medium">Scanning libraries...</p>
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────────
  if (!libraryScanResult) {
    return (
      <>
        <div className="p-3.5 space-y-4">
          <LibraryQuickActions onScan={handleScan} onScanPages={handleScanPages} selectionCount={selectionCount} />
          <EmptyState
            icon={<ListTree size={28} />}
            title="No scan results yet"
            description="Scan your selection, page, or file to discover all external libraries, their components, and properties."
          />
        </div>
        <PagePicker
          open={showPagePicker}
          onClose={() => setShowPagePicker(false)}
          onConfirm={handlePagePickerConfirm}
          actionLabel="Scan Selected Pages"
        />
      </>
    );
  }

  // ─── No libraries found ────────────────────────────────────────────
  if (libraryScanResult.libraries.length === 0) {
    return (
      <>
        <div className="p-3.5 space-y-4">
          <LibraryQuickActions onScan={handleScan} onScanPages={handleScanPages} selectionCount={selectionCount} />
          <EmptyState
            icon={<Package size={28} />}
            title="No libraries detected"
            description="No remote library components were found. Make sure the file uses components from published libraries."
          />
        </div>
        <PagePicker
          open={showPagePicker}
          onClose={() => setShowPagePicker(false)}
          onConfirm={handlePagePickerConfirm}
          actionLabel="Scan Selected Pages"
        />
      </>
    );
  }

  // ─── Results state ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Stats + Filters */}
        <div className="p-3.5 space-y-3">
          <ScanSummary result={libraryScanResult} />

          {/* Quick stats bar (like Audit's duration/nodes/issues bar) */}
          <motion.div
            className="flex items-center gap-3 text-2xs text-figma-text-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {libraryScanResult.scanInfo.duration < 1000
                ? `${libraryScanResult.scanInfo.duration}ms`
                : `${(libraryScanResult.scanInfo.duration / 1000).toFixed(1)}s`}
            </span>
            <span className="w-px h-3 bg-figma-border" />
            <span>{libraryScanResult.scanInfo.totalNodes.toLocaleString()} nodes</span>
            <span className="w-px h-3 bg-figma-border" />
            <span className="font-semibold text-figma-text">
              {libraryScanResult.scanInfo.totalInstances} instances
            </span>
          </motion.div>

          {/* Search filter */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-figma-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Filter components or properties..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-figma-border bg-figma-bg-secondary text-figma-text placeholder:text-figma-text-tertiary focus:outline-none focus:border-[var(--figma-color-bg-brand)] transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Library list (like Issue list with border-t) */}
        <div className="border-t border-figma-border">
          {filteredLibraries.length === 0 && searchQuery ? (
            <EmptyState
              icon={<Search size={24} />}
              title="No matches"
              description={`No components match "${searchQuery}". Try a different search.`}
            />
          ) : (
            filteredLibraries.map((lib) => (
              <LibrarySection key={lib.id} library={lib} />
            ))
          )}
        </div>
      </div>

      {/* Footer actions (fixed, like Audit's footer) */}
      <div className="shrink-0 p-3.5 border-t border-figma-border space-y-2.5 bg-figma-bg">
        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={reScan}
        >
          <RefreshCw size={14} />
          Re-Scan ({lastScanScope === 'selection' ? 'Selection' : lastScanScope === 'page' ? 'Page' : lastScanScope === 'pages' ? `${lastPageIds.length} Pages` : 'File'})
        </button>
      </div>
    </div>
  );
}
