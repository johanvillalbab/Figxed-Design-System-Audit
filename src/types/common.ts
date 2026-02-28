export type TabId = 'audit' | 'adoption' | 'libraries' | 'settings';

export type AuditScope = 'selection' | 'page' | 'file' | 'pages';

export interface PageInfo {
  id: string;
  name: string;
}

export interface ProgressPayload {
  current: number;
  total: number;
  label?: string;
}

export interface PluginConfig {
  version: string;
  audit: AuditConfig;
  adoption: AdoptionConfig;
}

export interface AuditConfig {
  enabledRules: string[];
  thresholds: {
    spacing: number;
    colorDeltaE: number;
    radius: number;
  };
  severityOverrides: Record<string, IssueSeverity>;
}

export interface AdoptionConfig {
  connectedLibraries: string[];
  scanOptions: ScanOptions;
}

export interface ScanOptions {
  ignoreHiddenLayers: boolean;
  groupDetachedComponents: boolean;
  includeTextStyles: boolean;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export const DEFAULT_CONFIG: PluginConfig = {
  version: '2.0.0',
  audit: {
    enabledRules: [
      'padding-without-variable',
      'gap-without-variable',
      'color-without-variable',
      'radius-without-variable',
    ],
    thresholds: {
      spacing: 4,
      colorDeltaE: 10,
      radius: 2,
    },
    severityOverrides: {},
  },
  adoption: {
    connectedLibraries: [],
    scanOptions: {
      ignoreHiddenLayers: true,
      groupDetachedComponents: true,
      includeTextStyles: true,
    },
  },
};
