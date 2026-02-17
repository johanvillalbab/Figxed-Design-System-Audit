/// <reference types="@figma/plugin-typings" />

import type { AuditCategory, AuditIssue } from '../../types/audit';
import type { IssueSeverity } from '../../types/common';
import { BaseRule } from './BaseRule';
import { findClosestSpacing } from '../matchers/spacingMatcher';

export class GapWithoutVariableRule extends BaseRule {
  id = 'gap-without-variable';
  name = 'Gap Without Variable';
  category: AuditCategory = 'spacing';
  severity: IssueSeverity = 'warning';
  description = 'Detects Auto Layout gap (itemSpacing / counterAxisSpacing) not bound to a variable.';

  async check(node: SceneNode): Promise<AuditIssue[]> {
    if (!('layoutMode' in node)) return [];
    const frame = node as FrameNode | ComponentNode | InstanceNode;
    if (frame.layoutMode === 'NONE') return [];

    const issues: AuditIssue[] = [];

    // Check itemSpacing (main axis gap)
    const itemSpacing = frame.itemSpacing;
    if (itemSpacing > 0) {
      const hasBound = frame.boundVariables?.itemSpacing !== undefined;
      if (!hasBound) {
        const suggestion = await findClosestSpacing(itemSpacing);
        issues.push(
          this.createIssue(node, {
            message: 'Item spacing (gap) without variable',
            property: 'itemSpacing',
            currentValue: `${itemSpacing}px`,
            suggestedVariable: suggestion,
          })
        );
      }
    }

    // Check counterAxisSpacing (wrap gap) if wrapping is enabled
    if ('layoutWrap' in frame && frame.layoutWrap === 'WRAP') {
      const counterAxisSpacing = (frame as FrameNode).counterAxisSpacing ?? 0;
      if (counterAxisSpacing > 0) {
        const hasBound = frame.boundVariables?.counterAxisSpacing !== undefined;
        if (!hasBound) {
          const suggestion = await findClosestSpacing(counterAxisSpacing);
          issues.push(
            this.createIssue(node, {
              message: 'Counter-axis spacing without variable',
              property: 'counterAxisSpacing',
              currentValue: `${counterAxisSpacing}px`,
              suggestedVariable: suggestion,
            })
          );
        }
      }
    }

    return issues;
  }

  async autoFix(node: SceneNode, issue: AuditIssue): Promise<void> {
    if (!issue.suggestedVariable) return;
    if (!('layoutMode' in node)) return;

    const frame = node as FrameNode | ComponentNode | InstanceNode;
    const variable = await figma.variables.getVariableByIdAsync(issue.suggestedVariable.id);
    if (!variable) return;

    if (issue.property === 'itemSpacing') {
      frame.setBoundVariable('itemSpacing', variable);
    } else if (issue.property === 'counterAxisSpacing') {
      (frame as FrameNode).setBoundVariable('counterAxisSpacing' as any, variable);
    }
  }
}
