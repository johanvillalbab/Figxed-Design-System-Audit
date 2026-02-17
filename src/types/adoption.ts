export interface AdoptionResult {
  metrics: AdoptionMetrics;
  components: ComponentUsage[];
  categories: CategoryMetrics[];
  nonAdoptedItems: NonAdoptedItem[];
  scanInfo: ScanInfo;
}

export type NonAdoptedCategory = 'component' | 'color' | 'spacing' | 'text-style' | 'radius';

export interface NonAdoptedItem {
  nodeId: string;
  nodeName: string;
  category: NonAdoptedCategory;
  reason: string;
}

export interface AdoptionMetrics {
  totalElements: number;
  dsComponents: number;
  customComponents: number;
  detachedComponents: number;
  adoptionRate: number;
}

export interface ComponentUsage {
  name: string;
  libraryName: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CategoryMetrics {
  name: string;
  total: number;
  adopted: number;
  rate: number;
}

export interface ScanInfo {
  scope: string;
  totalNodes: number;
  duration: number;
  timestamp: number;
}

export interface LibraryInfo {
  key: string;
  name: string;
  componentCount: number;
  connected: boolean;
}

export interface DetectedLibrary {
  /** Unique id for the library (derived from libraryName or key prefix) */
  id: string;
  /** Display name of the library */
  name: string;
  /** Variable collection names from this library */
  variableCollections: string[];
  /** Number of remote component instances found from this library */
  componentInstances: number;
  /** Number of styles detected from this library */
  styleCount: number;
  /** Whether to include this library in the DS adoption calculation */
  enabled: boolean;
}

// ─── Loaded Library (Source of Truth) ─────────────────────────────────────────

export interface LoadedVariableInfo {
  key: string;
  name: string;
  collectionName: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
}

export interface LoadedCollectionInfo {
  key: string;
  name: string;
  variableCount: number;
  modes: string[];
}

export interface LoadedComponentInfo {
  key: string;
  name: string;
  description: string;
}

export interface LoadedStyleInfo {
  id: string;
  name: string;
  styleType: 'PAINT' | 'TEXT' | 'EFFECT' | 'GRID';
}

export interface LoadedLibrarySummary {
  totalCollections: number;
  totalVariables: number;
  colorVariables: number;
  floatVariables: number;
  stringVariables: number;
  booleanVariables: number;
  totalComponents: number;
  totalStyles: number;
  paintStyles: number;
  textStyles: number;
  effectStyles: number;
  gridStyles: number;
}

export interface LoadedLibraryData {
  /** Unique identifier */
  id: string;
  /** Display name (from the Figma file name) */
  name: string;
  /** Name of the source file this was loaded from */
  fileName: string;
  /** Timestamp when the library was loaded */
  loadedAt: number;
  /** Variable collections loaded from the file */
  collections: LoadedCollectionInfo[];
  /** All variables loaded from the file */
  variables: LoadedVariableInfo[];
  /** All local components found in the file */
  components: LoadedComponentInfo[];
  /** All local styles found in the file */
  styles: LoadedStyleInfo[];
  /** Aggregated summary counts */
  summary: LoadedLibrarySummary;
}
