import { create } from 'zustand';
import type { TabId, ProgressPayload, PluginConfig, AuditScope, PageInfo } from '../../types/common';
import { DEFAULT_CONFIG } from '../../types/common';
import type { AuditResult, AuditIssue, AuditCategory } from '../../types/audit';
import type { AdoptionResult, DetectedLibrary, LoadedLibraryData, LibraryScanResult } from '../../types/adoption';
import type { IssueSeverity } from '../../types/common';

interface AppState {
  // Navigation
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // Selection
  selectionCount: number;
  selectedNodeIds: string[];
  setSelection: (count: number, nodeIds: string[]) => void;

  // Config
  config: PluginConfig;
  setConfig: (config: PluginConfig) => void;
  updateConfigValue: (path: string, value: unknown) => void;

  // Audit
  auditResult: AuditResult | null;
  setAuditResult: (result: AuditResult) => void;
  isAuditing: boolean;
  setIsAuditing: (v: boolean) => void;
  lastAuditScope: AuditScope | null;
  setLastAuditScope: (scope: AuditScope) => void;

  // Fixed / ignored issue tracking (local UI state)
  fixedIssueIds: string[];
  ignoredIssueIds: string[];
  addFixedIssue: (id: string) => void;
  addIgnoredIssue: (id: string) => void;
  showFixed: boolean;
  toggleShowFixed: () => void;

  // Audit filters
  categoryFilters: Record<AuditCategory, boolean>;
  toggleCategoryFilter: (cat: AuditCategory) => void;
  severityFilters: Record<IssueSeverity, boolean>;
  toggleSeverityFilter: (sev: IssueSeverity) => void;
  getFilteredIssues: () => AuditIssue[];

  // Adoption
  adoptionResult: AdoptionResult | null;
  setAdoptionResult: (result: AdoptionResult) => void;
  isScanning: boolean;
  setIsScanning: (v: boolean) => void;
  lastScanScope: AuditScope | null;
  setLastScanScope: (scope: AuditScope) => void;

  // Detected libraries
  detectedLibraries: DetectedLibrary[];
  isDetectingLibraries: boolean;
  setDetectedLibraries: (libs: DetectedLibrary[]) => void;
  setIsDetectingLibraries: (v: boolean) => void;
  toggleLibraryEnabled: (id: string) => void;

  // Loaded library (source of truth)
  loadedLibrary: LoadedLibraryData | null;
  setLoadedLibrary: (lib: LoadedLibraryData | null) => void;
  isLoadingLibrary: boolean;
  setIsLoadingLibrary: (v: boolean) => void;

  // Library scan (Detect Libraries feature)
  libraryScanResult: LibraryScanResult | null;
  setLibraryScanResult: (result: LibraryScanResult | null) => void;
  isScanningLibraries: boolean;
  setIsScanningLibraries: (v: boolean) => void;

  // Progress
  progress: ProgressPayload | null;
  setProgress: (p: ProgressPayload | null) => void;

  // File / page context
  fileName: string;
  pageName: string;
  setFileName: (name: string) => void;
  setPageName: (name: string) => void;

  // File pages (for page picker)
  filePages: PageInfo[];
  setFilePages: (pages: PageInfo[]) => void;
  selectedPageIds: string[];
  togglePageSelection: (pageId: string) => void;
  selectAllPages: () => void;
  deselectAllPages: () => void;

  // Help guide
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;

  // Notifications
  notification: { message: string; type: 'info' | 'success' | 'error' } | null;
  setNotification: (n: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

export function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        (target[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result as T;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  activeTab: 'adoption',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Selection
  selectionCount: 0,
  selectedNodeIds: [],
  setSelection: (count, nodeIds) => set({ selectionCount: count, selectedNodeIds: nodeIds }),

  // Config
  config: { ...DEFAULT_CONFIG },
  setConfig: (config) => set({ config }),
  updateConfigValue: (path, value) =>
    set((state) => {
      const newConfig = JSON.parse(JSON.stringify(state.config)) as PluginConfig;
      setNestedValue(newConfig as unknown as Record<string, unknown>, path, value);
      return { config: newConfig };
    }),

  // Audit
  auditResult: null,
  setAuditResult: (result) =>
    set({ auditResult: result, isAuditing: false, fixedIssueIds: [], ignoredIssueIds: [] }),
  isAuditing: false,
  setIsAuditing: (v) => set({ isAuditing: v }),
  lastAuditScope: null,
  setLastAuditScope: (scope) => set({ lastAuditScope: scope }),

  // Fixed / ignored tracking
  fixedIssueIds: [],
  ignoredIssueIds: [],
  addFixedIssue: (id) =>
    set((state) => ({
      fixedIssueIds: state.fixedIssueIds.includes(id)
        ? state.fixedIssueIds
        : [...state.fixedIssueIds, id],
    })),
  addIgnoredIssue: (id) =>
    set((state) => ({
      ignoredIssueIds: state.ignoredIssueIds.includes(id)
        ? state.ignoredIssueIds
        : [...state.ignoredIssueIds, id],
    })),
  showFixed: false,
  toggleShowFixed: () => set((state) => ({ showFixed: !state.showFixed })),

  // Filters
  categoryFilters: {
    spacing: true,
    color: true,
    geometry: true,
    typography: true,
    effects: true,
    layout: true,
  },
  toggleCategoryFilter: (cat) =>
    set((state) => ({
      categoryFilters: {
        ...state.categoryFilters,
        [cat]: !state.categoryFilters[cat],
      },
    })),
  severityFilters: {
    error: true,
    warning: true,
    info: true,
  },
  toggleSeverityFilter: (sev) =>
    set((state) => ({
      severityFilters: {
        ...state.severityFilters,
        [sev]: !state.severityFilters[sev],
      },
    })),
  getFilteredIssues: () => {
    const { auditResult, categoryFilters, severityFilters, fixedIssueIds, ignoredIssueIds, showFixed } = get();
    if (!auditResult) return [];
    return auditResult.issues.filter((issue) => {
      if (!categoryFilters[issue.category]) return false;
      if (!severityFilters[issue.severity]) return false;
      if (!showFixed && fixedIssueIds.includes(issue.id)) return false;
      if (!showFixed && ignoredIssueIds.includes(issue.id)) return false;
      return true;
    });
  },

  // Adoption
  adoptionResult: null,
  setAdoptionResult: (result) => set({ adoptionResult: result, isScanning: false }),
  isScanning: false,
  setIsScanning: (v) => set({ isScanning: v }),
  lastScanScope: null,
  setLastScanScope: (scope) => set({ lastScanScope: scope }),

  // Detected libraries
  detectedLibraries: [],
  isDetectingLibraries: false,
  setDetectedLibraries: (libs) => set({ detectedLibraries: libs, isDetectingLibraries: false }),
  setIsDetectingLibraries: (v) => set({ isDetectingLibraries: v }),
  toggleLibraryEnabled: (id) =>
    set((state) => ({
      detectedLibraries: state.detectedLibraries.map((lib) =>
        lib.id === id ? { ...lib, enabled: !lib.enabled } : lib
      ),
    })),

  // Loaded library (source of truth)
  loadedLibrary: null,
  setLoadedLibrary: (lib) => set({ loadedLibrary: lib, isLoadingLibrary: false }),
  isLoadingLibrary: false,
  setIsLoadingLibrary: (v) => set({ isLoadingLibrary: v }),

  // Library scan (Detect Libraries)
  libraryScanResult: null,
  setLibraryScanResult: (result) => set({ libraryScanResult: result, isScanningLibraries: false }),
  isScanningLibraries: false,
  setIsScanningLibraries: (v) => set({ isScanningLibraries: v }),

  // Progress
  progress: null,
  setProgress: (p) => set({ progress: p }),

  // File / page context
  fileName: '',
  pageName: '',
  setFileName: (name) => set({ fileName: name }),
  setPageName: (name) => set({ pageName: name }),

  // File pages (for page picker)
  filePages: [],
  setFilePages: (pages) => set({ filePages: pages, selectedPageIds: pages.map((p) => p.id) }),
  selectedPageIds: [],
  togglePageSelection: (pageId) =>
    set((state) => ({
      selectedPageIds: state.selectedPageIds.includes(pageId)
        ? state.selectedPageIds.filter((id) => id !== pageId)
        : [...state.selectedPageIds, pageId],
    })),
  selectAllPages: () =>
    set((state) => ({ selectedPageIds: state.filePages.map((p) => p.id) })),
  deselectAllPages: () => set({ selectedPageIds: [] }),

  // Help guide
  showHelp: false,
  setShowHelp: (v) => set({ showHelp: v }),

  // Notifications
  notification: null,
  setNotification: (n) => set({ notification: n }),
}));
