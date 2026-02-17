/// <reference types="@figma/plugin-typings" />

import type { VariableSuggestion } from '../../types/audit';
import { getFloatValue, variableToSuggestion, getAllAvailableVariables } from './utils';

let cachedVars: Variable[] | null = null;

export function clearSpacingCache(): void {
  cachedVars = null;
}

async function getSpacingVariables(): Promise<Variable[]> {
  if (cachedVars) return cachedVars;

  const allVars = await getAllAvailableVariables('FLOAT');
  cachedVars = allVars.filter((v) => {
      const lower = v.name.toLowerCase();
      return (
        lower.includes('spacing') ||
        lower.includes('padding') ||
        lower.includes('gap') ||
        lower.includes('space') ||
        lower.includes('size')
      );
    });

  return cachedVars;
}

/**
 * Find the closest spacing variable for a given pixel value.
 * Returns undefined if no variable is within the threshold.
 */
export async function findClosestSpacing(
  value: number,
  threshold: number = 4
): Promise<VariableSuggestion | undefined> {
  const vars = await getSpacingVariables();
  if (vars.length === 0) return undefined;

  let closest: Variable | undefined;
  let minDiff = Infinity;

  for (const variable of vars) {
    const varValue = await getFloatValue(variable);
    if (varValue === null) continue;

    const diff = Math.abs(varValue - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = variable;
    }
  }

  if (closest && minDiff <= threshold) {
    return await variableToSuggestion(closest);
  }

  return undefined;
}

/**
 * Find an exact match spacing variable (diff === 0).
 */
export async function findExactSpacing(value: number): Promise<VariableSuggestion | undefined> {
  return await findClosestSpacing(value, 0);
}
