/// <reference types="@figma/plugin-typings" />

import type { VariableSuggestion } from '../../types/audit';
import { getColorValue, variableToSuggestion, deltaE, getAllAvailableVariables } from './utils';

let cachedVars: Variable[] | null = null;

export function clearColorCache(): void {
  cachedVars = null;
}

async function getColorVariables(): Promise<Variable[]> {
  if (cachedVars) return cachedVars;
  cachedVars = await getAllAvailableVariables('COLOR');
  return cachedVars;
}

/**
 * Find the closest color variable for a given RGB value using CIE76 Delta E.
 * Returns undefined if no variable is within the threshold.
 */
export async function findClosestColor(
  rgb: RGB,
  threshold: number = 10
): Promise<VariableSuggestion | undefined> {
  const vars = await getColorVariables();
  if (vars.length === 0) return undefined;

  let closest: Variable | undefined;
  let minDelta = Infinity;

  for (const variable of vars) {
    const varColor = await getColorValue(variable);
    if (!varColor) continue;

    const delta = deltaE(rgb, varColor);
    if (delta < minDelta) {
      minDelta = delta;
      closest = variable;
    }
  }

  if (closest && minDelta <= threshold) {
    return await variableToSuggestion(closest);
  }

  return undefined;
}

/**
 * Find an exact-match color variable (deltaE < 1 = imperceptible).
 */
export async function findExactColor(rgb: RGB): Promise<VariableSuggestion | undefined> {
  return await findClosestColor(rgb, 1);
}
