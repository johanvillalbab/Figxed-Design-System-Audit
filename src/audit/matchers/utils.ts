/// <reference types="@figma/plugin-typings" />

import type { VariableSuggestion } from '../../types/audit';

export async function variableToSuggestion(variable: Variable): Promise<VariableSuggestion> {
  const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
  const modeId = collection ? Object.keys(variable.valuesByMode)[0] : undefined;
  const rawValue = modeId ? variable.valuesByMode[modeId] : undefined;

  let resolvedValue: string | number;
  if (typeof rawValue === 'number') {
    resolvedValue = rawValue;
  } else if (rawValue && typeof rawValue === 'object' && 'r' in rawValue) {
    resolvedValue = rgbToHex(rawValue as RGB);
  } else {
    resolvedValue = String(rawValue ?? '');
  }

  return {
    id: variable.id,
    name: variable.name,
    collectionName: collection?.name ?? 'Unknown',
    resolvedValue,
  };
}

export async function getFloatValue(variable: Variable): Promise<number | null> {
  const modeId = Object.keys(variable.valuesByMode)[0];
  if (!modeId) return null;
  const value = variable.valuesByMode[modeId];

  if (typeof value === 'number') return value;

  // Handle variable alias - resolve it
  if (value && typeof value === 'object' && 'type' in value && (value as VariableAlias).type === 'VARIABLE_ALIAS') {
    const alias = value as VariableAlias;
    const resolved = await figma.variables.getVariableByIdAsync(alias.id);
    if (resolved) return getFloatValue(resolved);
  }

  return null;
}

export async function getColorValue(variable: Variable): Promise<RGB | null> {
  const modeId = Object.keys(variable.valuesByMode)[0];
  if (!modeId) return null;
  const value = variable.valuesByMode[modeId];

  if (value && typeof value === 'object' && 'r' in value) {
    return value as RGB;
  }

  // Handle variable alias
  if (value && typeof value === 'object' && 'type' in value && (value as VariableAlias).type === 'VARIABLE_ALIAS') {
    const alias = value as VariableAlias;
    const resolved = await figma.variables.getVariableByIdAsync(alias.id);
    if (resolved) return getColorValue(resolved);
  }

  return null;
}

export function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert RGB (0-1 range) to CIE Lab color space for perceptual comparison.
 * Uses a simplified sRGB -> XYZ -> Lab pipeline.
 */
export function rgbToLab(rgb: RGB): { l: number; a: number; b: number } {
  // sRGB to linear
  let r = rgb.r, g = rgb.g, b = rgb.b;
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Linear RGB to XYZ (D65 illuminant)
  let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

  // Normalize for D65
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  // XYZ to Lab
  const epsilon = 0.008856;
  const kappa = 903.3;

  x = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/**
 * CIE76 Delta E - perceptual color difference.
 * < 1: not perceptible
 * 1-2: close examination
 * 2-10: noticeable at a glance
 * > 10: clearly different colors
 */
export function deltaE(color1: RGB, color2: RGB): number {
  const lab1 = rgbToLab(color1);
  const lab2 = rgbToLab(color2);

  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

// ─── Variable Collection Helpers ──────────────────────────────────────────────

/**
 * Get all available variables of a given type, combining local variables
 * with variables imported from team libraries that are already used in the file.
 *
 * Uses `getLocalVariablesAsync` which is required for plugins with "dynamic-page" document access.
 */
export async function getAllAvailableVariables(type: VariableResolvedDataType): Promise<Variable[]> {
  // Start with local variables
  const localVars = await figma.variables.getLocalVariablesAsync(type);
  const allVars: Variable[] = [...localVars];
  const seenIds = new Set(localVars.map((v) => v.id));

  // Also scan all variable collections accessible in the file
  // This includes collections imported from team libraries
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    for (const collection of collections) {
      for (const varId of collection.variableIds) {
        if (seenIds.has(varId)) continue;
        const variable = await figma.variables.getVariableByIdAsync(varId);
        if (variable && variable.resolvedType === type) {
          allVars.push(variable);
          seenIds.add(varId);
        }
      }
    }
  } catch {
    // Fallback: if getLocalVariableCollections is not available, just use locals
  }

  return allVars;
}
