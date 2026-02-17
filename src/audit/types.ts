/// <reference types="@figma/plugin-typings" />

import type { AuditCategory, AuditIssue, VariableSuggestion } from '../types/audit';
import type { IssueSeverity } from '../types/common';

export interface AuditRule {
  id: string;
  name: string;
  category: AuditCategory;
  severity: IssueSeverity;
  description: string;
  check(node: SceneNode): Promise<AuditIssue[]>;
  autoFix?(node: SceneNode, issue: AuditIssue): Promise<void>;
}

export interface MatcherResult {
  variable: VariableSuggestion;
  distance: number;
}
