/// <reference types="@figma/plugin-typings" />

import type { AuditCategory, AuditIssue } from '../../types/audit';
import type { IssueSeverity } from '../../types/common';
import { BaseRule } from './BaseRule';
import { findClosestColor } from '../matchers/colorMatcher';
import { rgbToHex } from '../matchers/utils';

type PaintableNode = SceneNode & {
  fills: readonly Paint[] | typeof figma.mixed;
  strokes: readonly Paint[];
  boundVariables?: SceneNode['boundVariables'];
};

function isPaintable(node: SceneNode): node is PaintableNode {
  return 'fills' in node && 'strokes' in node;
}

export class ColorWithoutVariableRule extends BaseRule {
  id = 'color-without-variable';
  name = 'Color Without Variable';
  category: AuditCategory = 'color';
  severity: IssueSeverity = 'error';
  description = 'Detects fill and stroke colors not bound to a variable (or color style).';

  async check(node: SceneNode): Promise<AuditIssue[]> {
    if (!isPaintable(node)) return [];

    const issues: AuditIssue[] = [];

    // Check fills
    const fills = node.fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        if (!fill.visible) continue;
        if (fill.type !== 'SOLID') continue;

        const hasBoundVar = this.hasBoundColorVar(node, 'fills', i);
        const hasStyle = 'fillStyleId' in node && node.fillStyleId !== '' && node.fillStyleId !== figma.mixed;

        if (!hasBoundVar && !hasStyle) {
          const hex = rgbToHex(fill.color);
          const suggestion = await findClosestColor(fill.color);

          issues.push(
            this.createIssue(node, {
              message: `Fill color without variable`,
              property: `fills[${i}]`,
              currentValue: hex,
              suggestedVariable: suggestion,
            })
          );
        }
      }
    }

    // Check strokes
    const strokes = node.strokes;
    if (Array.isArray(strokes)) {
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        if (!stroke.visible) continue;
        if (stroke.type !== 'SOLID') continue;

        const hasBoundVar = this.hasBoundColorVar(node, 'strokes', i);
        const hasStyle = 'strokeStyleId' in node && (node as any).strokeStyleId !== '';

        if (!hasBoundVar && !hasStyle) {
          const hex = rgbToHex(stroke.color);
          const suggestion = await findClosestColor(stroke.color);

          issues.push(
            this.createIssue(node, {
              message: `Stroke color without variable`,
              property: `strokes[${i}]`,
              currentValue: hex,
              suggestedVariable: suggestion,
            })
          );
        }
      }
    }

    return issues;
  }

  private hasBoundColorVar(node: SceneNode, paintType: 'fills' | 'strokes', index: number): boolean {
    const bound = node.boundVariables;
    if (!bound) return false;

    const bindings = bound[paintType];
    if (!bindings) return false;

    if (Array.isArray(bindings)) {
      const binding = bindings[index];
      return binding !== undefined;
    }

    return false;
  }

  async autoFix(node: SceneNode, issue: AuditIssue): Promise<void> {
    if (!issue.suggestedVariable) return;
    if (!isPaintable(node)) return;

    const variable = await figma.variables.getVariableByIdAsync(issue.suggestedVariable.id);
    if (!variable) return;

    // Parse property to get paint type and index
    const match = issue.property.match(/^(fills|strokes)\[(\d+)\]$/);
    if (!match) return;

    const paintType = match[1] as 'fills' | 'strokes';
    const index = parseInt(match[2], 10);

    // Use setBoundVariable for the specific fill/stroke
    const paints = paintType === 'fills' ? node.fills : node.strokes;
    if (paints === figma.mixed) return;
    if (!Array.isArray(paints) || index >= paints.length) return;

    // Clone the paint with the variable binding
    const newPaints = [...paints];
    const paint = { ...newPaints[index] } as SolidPaint;
    newPaints[index] = figma.variables.setBoundVariableForPaint(paint, 'color', variable);

    if (paintType === 'fills') {
      (node as any).fills = newPaints;
    } else {
      (node as any).strokes = newPaints;
    }
  }
}
