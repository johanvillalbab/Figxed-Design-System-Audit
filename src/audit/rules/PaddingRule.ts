/// <reference types="@figma/plugin-typings" />

import type { AuditCategory, AuditIssue } from '../../types/audit';
import type { IssueSeverity } from '../../types/common';
import { BaseRule } from './BaseRule';
import { findClosestSpacing } from '../matchers/spacingMatcher';

const PADDING_PROPS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
type PaddingProp = typeof PADDING_PROPS[number];

const PADDING_LABELS: Record<PaddingProp, string> = {
  paddingTop: 'Top',
  paddingRight: 'Right',
  paddingBottom: 'Bottom',
  paddingLeft: 'Left',
};

export class PaddingWithoutVariableRule extends BaseRule {
  id = 'padding-without-variable';
  name = 'Padding Without Variable';
  category: AuditCategory = 'spacing';
  severity: IssueSeverity = 'warning';
  description = 'Detects Auto Layout padding values not bound to a variable.';

  async check(node: SceneNode): Promise<AuditIssue[]> {
    // Only frames with auto layout have padding
    if (!('layoutMode' in node)) return [];
    const frame = node as FrameNode | ComponentNode | InstanceNode;
    if (frame.layoutMode === 'NONE') return [];

    const issues: AuditIssue[] = [];

    for (const prop of PADDING_PROPS) {
      const value = frame[prop];
      if (value === 0) continue; // 0 padding is fine without variable

      const hasBoundVar = frame.boundVariables?.[prop] !== undefined;
      if (hasBoundVar) continue;

      const suggestion = await findClosestSpacing(value);

      issues.push(
        this.createIssue(node, {
          message: `Padding ${PADDING_LABELS[prop]} without variable`,
          property: prop,
          currentValue: `${value}px`,
          suggestedVariable: suggestion,
        })
      );
    }

    return issues;
  }

  async autoFix(node: SceneNode, issue: AuditIssue): Promise<void> {
    if (!issue.suggestedVariable) return;
    if (!('layoutMode' in node)) return;

    const frame = node as FrameNode | ComponentNode | InstanceNode;
    const variable = await figma.variables.getVariableByIdAsync(issue.suggestedVariable.id);
    if (!variable) return;

    frame.setBoundVariable(issue.property as PaddingProp, variable);
  }
}
