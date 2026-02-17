import type { AuditScope, ProgressPayload, ScanOptions } from './common';
import type { AuditResult, FixResult, FixAllResult } from './audit';
import type {
  AdoptionResult,
  LibraryInfo,
  DetectedLibrary,
  LoadedLibraryData,
} from './adoption';

// Messages from UI -> Plugin sandbox (code.ts)
export type ToCodeMessage =
  | { type: 'START_AUDIT'; payload: { scope: AuditScope } }
  | { type: 'FIX_ISSUE'; payload: { issueId: string } }
  | { type: 'FIX_ALL'; payload: { category: string } }
  | { type: 'IGNORE_ISSUE'; payload: { nodeId: string; ruleId: string } }
  | { type: 'UNIGNORE_ISSUE'; payload: { nodeId: string; ruleId: string } }
  | { type: 'START_ADOPTION_SCAN'; payload: { scope: AuditScope; options: ScanOptions } }
  | { type: 'CONNECT_LIBRARY'; payload: { libraryKey: string } }
  | { type: 'SELECT_NODE'; payload: { nodeId: string } }
  | { type: 'EXPORT_DATA'; payload: { format: 'json' | 'csv' | 'md' } }
  | { type: 'GET_LIBRARIES' }
  | { type: 'DETECT_LIBRARIES' }
  | { type: 'GET_CONFIG' }
  | { type: 'UPDATE_CONFIG'; payload: { path: string; value: unknown } }
  | { type: 'SAVE_USER_CONFIG'; payload: { path: string; value: unknown } }
  | { type: 'UI_READY' }
  // Library loading (source of truth) — scans the current file
  | { type: 'LOAD_LIBRARY_FROM_FILE' }
  | { type: 'UNLOAD_LIBRARY' }
  | { type: 'REFRESH_LOADED_LIBRARY' }
  // Resize
  | { type: 'RESIZE'; payload: { width: number; height: number } };

// Messages from Plugin sandbox (code.ts) -> UI
export type ToUIMessage =
  | { type: 'AUDIT_RESULTS'; payload: AuditResult }
  | { type: 'ADOPTION_RESULTS'; payload: AdoptionResult }
  | { type: 'FIX_RESULT'; payload: FixResult }
  | { type: 'FIX_ALL_RESULT'; payload: FixAllResult }
  | { type: 'PROGRESS_UPDATE'; payload: ProgressPayload }
  | { type: 'LIBRARIES_LIST'; payload: LibraryInfo[] }
  | { type: 'LIBRARIES_DETECTED'; payload: DetectedLibrary[] }
  | { type: 'CONFIG_DATA'; payload: Record<string, unknown> }
  | { type: 'USER_CONFIG_DATA'; payload: Record<string, unknown> }
  | { type: 'ERROR'; payload: { message: string; code?: string } }
  | { type: 'SELECTION_CHANGED'; payload: { count: number; nodeIds: string[] } }
  | { type: 'PAGE_CHANGED'; payload: { pageName: string } }
  | { type: 'FILE_INFO'; payload: { fileName: string; pageName: string } }
  | { type: 'NOTIFY'; payload: { message: string; type: 'info' | 'success' | 'error' } }
  // Library loading (source of truth)
  | { type: 'LIBRARY_LOADED'; payload: LoadedLibraryData }
  | { type: 'LIBRARY_UNLOADED' };
