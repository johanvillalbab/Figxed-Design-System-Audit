/// <reference types="@figma/plugin-typings" />

import type { VariableSuggestion } from '../../types/audit';
import { getFloatValue, variableToSuggestion, getAllAvailableVariables } from './utils';

let cachedVars: Variable[] | null = null;

export function clearRadiusCache(): void {
  cachedVars = null;
}

async function getRadiusVariables(): Promise<Variable[]> {
  if (cachedVars) return cachedVars;

  const allVars = await getAllAvailableVariables('FLOAT');
  cachedVars = allVars.filter((v) => {
      const lower = v.name.toLowerCase();
      return (
        lower.includes('radius') ||
        lower.includes('corner') ||
        lower.includes('round')
      );
    });

  return cachedVars;
}

/**
 * Find the closest radius variable for a given pixel value.
 * Returns undefined if no variable is within the threshold.
 */
export async function findClosestRadius(
  value: number,
  threshold: number = 2
): Promise<VariableSuggestion | undefined> {
  const vars = await getRadiusVariables();
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
