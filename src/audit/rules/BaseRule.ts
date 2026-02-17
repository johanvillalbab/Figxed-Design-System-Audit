/// <reference types="@figma/plugin-typings" />

import type { AuditCategory, AuditIssue } from '../../types/audit';
import type { IssueSeverity } from '../../types/common';
import type { AuditRule } from '../types';

export abstract class BaseRule implements AuditRule {
  abstract id: string;
  abstract name: string;
  abstract category: AuditCategory;
  abstract severity: IssueSeverity;
  abstract description: string;

  abstract check(node: SceneNode): Promise<AuditIssue[]>;

  autoFix?(node: SceneNode, issue: AuditIssue): Promise<void>;

  /**
   * Creates an issue with a deterministic ID based on rule + node + property.
   * This ensures IDs are stable between re-audits (same node + property = same ID)
   * and naturally unique (no global counter needed).
   */
  protected createIssue(
    node: SceneNode,
    data: Pick<AuditIssue, 'message' | 'property' | 'currentValue'> &
      Partial<Pick<AuditIssue, 'suggestedVariable' | 'canAutoFix' | 'severity'>>
  ): AuditIssue {
    return {
      id: `${this.id}::${node.id}::${data.property}`,
      ruleId: this.id,
      category: this.category,
      severity: data.severity ?? this.severity,
      nodeId: node.id,
      nodeName: node.name,
      nodePath: getNodePath(node),
      message: data.message,
      property: data.property,
      currentValue: data.currentValue,
      suggestedVariable: data.suggestedVariable,
      canAutoFix: data.canAutoFix ?? !!data.suggestedVariable,
      isIgnored: false,
    };
  }
}

function getNodePath(node: SceneNode): string {
  const parts: string[] = [];
  let current: BaseNode | null = node;

  while (current && current.type !== 'DOCUMENT' && current.type !== 'PAGE') {
    if ('name' in current) {
      parts.unshift(current.name);
    }
    current = current.parent;
  }

  return parts.join(' > ');
}
