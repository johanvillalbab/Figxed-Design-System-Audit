import type { IssueSeverity } from './common';

export type AuditCategory =
  | 'spacing'
  | 'color'
  | 'geometry'
  | 'typography'
  | 'effects'
  | 'layout';

export interface AuditIssue {
  id: string;
  ruleId: string;
  category: AuditCategory;
  severity: IssueSeverity;
  nodeId: string;
  nodeName: string;
  nodePath: string;
  message: string;
  property: string;
  currentValue: string | number;
  suggestedVariable?: VariableSuggestion;
  canAutoFix: boolean;
  isIgnored: boolean;
}

export interface VariableSuggestion {
  id: string;
  name: string;
  collectionName: string;
  resolvedValue: string | number;
}

export interface AuditSummary {
  totalIssues: number;
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<IssueSeverity, number>;
  autoFixable: number;
}

export interface AuditStats {
  totalNodes: number;
  processedNodes: number;
  totalIssues: number;
  nodesWithIssues: number;
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<IssueSeverity, number>;
  duration: number;
}

export interface AuditResult {
  issues: AuditIssue[];
  summary: AuditSummary;
  stats: AuditStats;
}

export interface AuditRuleConfig {
  id: string;
  name: string;
  category: AuditCategory;
  severity: IssueSeverity;
  description: string;
  enabled: boolean;
}

export interface FixResult {
  issueId: string;
  success: boolean;
  error?: string;
}

export interface FixAllResult {
  total: number;
  fixed: number;
  failed: number;
  results: FixResult[];
}

export type CategoryFilterState = Record<AuditCategory, boolean>;

export type SeverityFilterState = Record<IssueSeverity, boolean>;
