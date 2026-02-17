/// <reference types="@figma/plugin-typings" />

import type { AuditCategory, AuditIssue } from '../../types/audit';
import type { IssueSeverity } from '../../types/common';
import { BaseRule } from './BaseRule';
import { findClosestRadius } from '../matchers/radiusMatcher';

type RoundableNode = SceneNode & {
  cornerRadius: number | typeof figma.mixed;
  topLeftRadius: number;
  topRightRadius: number;
  bottomLeftRadius: number;
  bottomRightRadius: number;
};

function isRoundable(node: SceneNode): node is RoundableNode {
  return 'cornerRadius' in node;
}

const CORNER_PROPS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
type CornerProp = typeof CORNER_PROPS[number];

const CORNER_LABELS: Record<CornerProp, string> = {
  topLeftRadius: 'Top Left',
  topRightRadius: 'Top Right',
  bottomLeftRadius: 'Bottom Left',
  bottomRightRadius: 'Bottom Right',
};

export class RadiusWithoutVariableRule extends BaseRule {
  id = 'radius-without-variable';
  name = 'Border Radius Without Variable';
  category: AuditCategory = 'geometry';
  severity: IssueSeverity = 'warning';
  description = 'Detects border radius values not bound to a variable.';

  async check(node: SceneNode): Promise<AuditIssue[]> {
    if (!isRoundable(node)) return [];

    const issues: AuditIssue[] = [];
    const { cornerRadius } = node;

    if (cornerRadius !== figma.mixed) {
      // Uniform radius - check topLeftRadius as representative
      if (cornerRadius > 0) {
        const hasBound = node.boundVariables?.topLeftRadius !== undefined;
        if (!hasBound) {
          const suggestion = await findClosestRadius(cornerRadius);
          issues.push(
            this.createIssue(node, {
              message: `Border radius without variable`,
              property: 'topLeftRadius',
              currentValue: `${cornerRadius}px`,
              suggestedVariable: suggestion,
            })
          );
        }
      }
    } else {
      // Mixed - check individual corners
      for (const prop of CORNER_PROPS) {
        const value = node[prop];
        if (value === 0) continue;

        const hasBound = node.boundVariables?.[prop] !== undefined;
        if (hasBound) continue;

        const suggestion = await findClosestRadius(value);
        issues.push(
          this.createIssue(node, {
            message: `${CORNER_LABELS[prop]} radius without variable`,
            property: prop,
            currentValue: `${value}px`,
            suggestedVariable: suggestion,
          })
        );
      }
    }

    return issues;
  }

  async autoFix(node: SceneNode, issue: AuditIssue): Promise<void> {
    if (!issue.suggestedVariable) return;
    if (!isRoundable(node)) return;

    const variable = await figma.variables.getVariableByIdAsync(issue.suggestedVariable.id);
    if (!variable) return;

    const prop = issue.property as CornerProp;

    // If it was a uniform radius, apply to all corners
    if (node.cornerRadius !== figma.mixed) {
      for (const corner of CORNER_PROPS) {
        node.setBoundVariable(corner, variable);
      }
    } else {
      node.setBoundVariable(prop, variable);
    }
  }
}
