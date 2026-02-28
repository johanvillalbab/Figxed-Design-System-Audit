import type { AuditResult, AuditIssue } from '../../types/audit';
import type { AdoptionResult } from '../../types/adoption';
import type { LoadedLibraryData } from '../../types/adoption';
import type { AuditScope } from '../../types/common';

// ─── Export Context ───────────────────────────────────────────────────────────

export interface ExportContext {
  scope?: AuditScope | null;
  pageName?: string;
  fileName?: string;
  libraryName?: string;
  loadedLibrary?: LoadedLibraryData | null;
  adoptionResult?: AdoptionResult | null;
  selectionCount?: number;
}

// ─── Audit Exporters ──────────────────────────────────────────────────────────

export function exportAuditJSON(result: AuditResult, ctx?: ExportContext): string {
  const healthScore = result.stats.processedNodes > 0
    ? Math.max(0, Math.min(100, Math.round(((result.stats.processedNodes - result.stats.nodesWithIssues) / result.stats.processedNodes) * 100)))
    : 100;

  const payload: Record<string, unknown> = {
    generated: new Date().toISOString(),
    file: {
      name: ctx?.fileName ?? 'Unknown',
      page: ctx?.pageName ?? 'Unknown',
      scope: ctx?.scope ?? 'unknown',
      selectionCount: ctx?.selectionCount ?? null,
    },
    healthScore,
    summary: result.summary,
    stats: {
      ...result.stats,
      durationFormatted: result.stats.duration < 1000
        ? `${result.stats.duration}ms`
        : `${(result.stats.duration / 1000).toFixed(1)}s`,
    },
  };

  if (ctx?.loadedLibrary) {
    const lib = ctx.loadedLibrary;
    payload.library = {
      name: lib.fileName,
      loadedAt: new Date(lib.loadedAt).toISOString(),
      summary: lib.summary,
      collections: lib.collections.map((c) => ({
        name: c.name,
        variableCount: c.variableCount,
        modes: c.modes,
      })),
      components: lib.components.map((c) => ({
        name: c.name,
        description: c.description || null,
      })),
      styles: lib.styles.map((s) => ({
        name: s.name,
        type: s.styleType,
      })),
    };
  }

  if (ctx?.adoptionResult) {
    const ar = ctx.adoptionResult;
    payload.adoption = {
      metrics: ar.metrics,
      categories: ar.categories,
      components: ar.components,
      scanInfo: {
        ...ar.scanInfo,
        timestampFormatted: new Date(ar.scanInfo.timestamp).toISOString(),
      },
    };
  }

  payload.issues = result.issues.map((i) => ({
    id: i.id,
    ruleId: i.ruleId,
    category: i.category,
    severity: i.severity,
    nodeId: i.nodeId,
    nodeName: i.nodeName,
    nodePath: i.nodePath,
    message: i.message,
    property: i.property,
    currentValue: i.currentValue,
    suggestedVariable: i.suggestedVariable
      ? {
          id: i.suggestedVariable.id,
          name: i.suggestedVariable.name,
          collection: i.suggestedVariable.collectionName,
          resolvedValue: i.suggestedVariable.resolvedValue,
        }
      : null,
    canAutoFix: i.canAutoFix,
    isIgnored: i.isIgnored,
  }));

  return JSON.stringify(payload, null, 2);
}

export function exportAuditCSV(result: AuditResult, ctx?: ExportContext): string {
  const healthScore = result.stats.processedNodes > 0
    ? Math.max(0, Math.min(100, Math.round(((result.stats.processedNodes - result.stats.nodesWithIssues) / result.stats.processedNodes) * 100)))
    : 100;
  const durationLabel = result.stats.duration < 1000 ? `${result.stats.duration}ms` : `${(result.stats.duration / 1000).toFixed(1)}s`;

  const meta: string[] = [];
  meta.push(`# Figxed Design System Audit Report`);
  meta.push(`# Generated: ${new Date().toISOString()}`);
  if (ctx?.fileName) meta.push(`# File: ${ctx.fileName}`);
  if (ctx?.pageName) meta.push(`# Page: ${ctx.pageName}`);
  if (ctx?.scope) meta.push(`# Scope: ${ctx.scope}`);
  if (ctx?.selectionCount != null) meta.push(`# Selection Count: ${ctx.selectionCount}`);
  meta.push(`# Health Score: ${healthScore}%`);
  meta.push(`# Duration: ${durationLabel}`);
  meta.push(`# Total Nodes Scanned: ${result.stats.processedNodes}`);
  meta.push(`# Nodes with Issues: ${result.stats.nodesWithIssues}`);
  meta.push(`# Total Issues: ${result.summary.totalIssues}`);
  meta.push(`# Auto-fixable Issues: ${result.summary.autoFixable}`);

  // Category breakdown
  const catEntries = Object.entries(result.summary.byCategory).filter(([, c]) => c > 0);
  if (catEntries.length > 0) {
    meta.push(`# Issues by Category: ${catEntries.map(([k, v]) => `${capitalize(k)}=${v}`).join(', ')}`);
  }
  // Severity breakdown
  const sevEntries = Object.entries(result.summary.bySeverity).filter(([, c]) => c > 0);
  if (sevEntries.length > 0) {
    meta.push(`# Issues by Severity: ${sevEntries.map(([k, v]) => `${capitalize(k)}=${v}`).join(', ')}`);
  }

  // Library info
  if (ctx?.loadedLibrary) {
    const lib = ctx.loadedLibrary;
    meta.push(`# Library: ${lib.fileName}`);
    meta.push(`# Library Loaded: ${new Date(lib.loadedAt).toISOString()}`);
    meta.push(`# Library Variables: ${lib.summary.totalVariables} (Color=${lib.summary.colorVariables}, Number=${lib.summary.floatVariables}, String=${lib.summary.stringVariables}, Boolean=${lib.summary.booleanVariables})`);
    meta.push(`# Library Components: ${lib.summary.totalComponents}`);
    meta.push(`# Library Styles: ${lib.summary.totalStyles} (Paint=${lib.summary.paintStyles}, Text=${lib.summary.textStyles}, Effect=${lib.summary.effectStyles}, Grid=${lib.summary.gridStyles})`);
    if (lib.collections.length > 0) {
      meta.push(`# Library Collections: ${lib.collections.map((c) => `${c.name} (${c.variableCount} vars, ${c.modes.length} modes)`).join('; ')}`);
    }
  } else if (ctx?.libraryName) {
    meta.push(`# Library: ${ctx.libraryName}`);
  }

  // Adoption info
  if (ctx?.adoptionResult) {
    const ar = ctx.adoptionResult;
    meta.push(`#`);
    meta.push(`# Adoption Rate: ${ar.metrics.adoptionRate}%`);
    meta.push(`# Total Elements: ${ar.metrics.totalElements}`);
    meta.push(`# DS Components: ${ar.metrics.dsComponents}, Custom: ${ar.metrics.customComponents}, Detached: ${ar.metrics.detachedComponents}`);
    if (ar.categories.length > 0) {
      meta.push(`# Adoption by Category: ${ar.categories.map((c) => `${c.name}=${c.adopted}/${c.total} (${c.rate}%)`).join(', ')}`);
    }
  }

  meta.push('');

  const headers = [
    '#',
    'Issue ID',
    'Rule',
    'Category',
    'Severity',
    'Node ID',
    'Node Name',
    'Node Path',
    'Message',
    'Property',
    'Current Value',
    'Suggested Variable ID',
    'Suggested Variable',
    'Suggested Collection',
    'Suggested Value',
    'Auto-fixable',
    'Ignored',
  ];

  const rows = result.issues.map((i, idx) =>
    [
      idx + 1,
      csvEscape(i.id),
      i.ruleId,
      i.category,
      i.severity,
      i.nodeId,
      csvEscape(i.nodeName),
      csvEscape(i.nodePath),
      csvEscape(i.message),
      i.property,
      csvEscape(String(i.currentValue ?? '')),
      csvEscape(i.suggestedVariable?.id ?? ''),
      csvEscape(i.suggestedVariable?.name ?? ''),
      csvEscape(i.suggestedVariable?.collectionName ?? ''),
      csvEscape(String(i.suggestedVariable?.resolvedValue ?? '')),
      i.canAutoFix ? 'Yes' : 'No',
      i.isIgnored ? 'Yes' : 'No',
    ].join(',')
  );

  return [...meta, headers.join(','), ...rows].join('\n');
}

export function exportAuditMarkdown(result: AuditResult, ctx?: ExportContext): string {
  const { summary, stats } = result;

  const healthScore =
    stats.processedNodes > 0
      ? Math.max(0, Math.min(100, Math.round(((stats.processedNodes - stats.nodesWithIssues) / stats.processedNodes) * 100)))
      : 100;

  const scopeLabel = ctx?.scope === 'selection' ? 'Selection' : ctx?.scope === 'page' ? 'Page' : ctx?.scope === 'file' ? 'Full File' : 'Unknown';
  const durationLabel = stats.duration < 1000 ? `${stats.duration}ms` : `${(stats.duration / 1000).toFixed(1)}s`;

  const lines: string[] = [
    '# Figxed Design System Audit Report',
    '',
    '## File Information',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generated | ${new Date().toLocaleString()} |`,
    `| File | ${mdEscape(ctx?.fileName ?? 'Unknown')} |`,
    `| Page | ${mdEscape(ctx?.pageName ?? 'Unknown')} |`,
    `| Scope | ${scopeLabel} |`,
  ];

  if (ctx?.selectionCount != null && ctx.scope === 'selection') {
    lines.push(`| Selected Layers | ${ctx.selectionCount} |`);
  }

  lines.push(
    `| Health Score | **${healthScore}%** |`,
    `| Duration | ${durationLabel} |`,
  );

  // ── Library section ───────────────────────────────────────────────
  if (ctx?.loadedLibrary) {
    const lib = ctx.loadedLibrary;

    lines.push(
      '',
      '## Design System Library',
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Library File | ${mdEscape(lib.fileName)} |`,
      `| Loaded At | ${new Date(lib.loadedAt).toLocaleString()} |`,
      `| Collections | ${lib.summary.totalCollections} |`,
      `| Variables | ${lib.summary.totalVariables} (Color: ${lib.summary.colorVariables}, Number: ${lib.summary.floatVariables}, String: ${lib.summary.stringVariables}, Boolean: ${lib.summary.booleanVariables}) |`,
      `| Components | ${lib.summary.totalComponents} |`,
      `| Styles | ${lib.summary.totalStyles} (Paint: ${lib.summary.paintStyles}, Text: ${lib.summary.textStyles}, Effect: ${lib.summary.effectStyles}, Grid: ${lib.summary.gridStyles}) |`,
    );

    if (lib.collections.length > 0) {
      lines.push(
        '',
        '### Variable Collections',
        '',
        `| Collection | Variables | Modes |`,
        `|------------|-----------|-------|`,
        ...lib.collections.map((c) =>
          `| ${mdEscape(c.name)} | ${c.variableCount} | ${c.modes.join(', ')} |`
        ),
      );
    }
  } else if (ctx?.libraryName) {
    lines.push(`| Design System Library | ${mdEscape(ctx.libraryName)} |`);
  }

  // ── Adoption section ──────────────────────────────────────────────
  if (ctx?.adoptionResult) {
    const ar = ctx.adoptionResult;

    lines.push(
      '',
      '## Design System Adoption',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Adoption Rate | **${ar.metrics.adoptionRate}%** |`,
      `| Total Elements | ${ar.metrics.totalElements.toLocaleString()} |`,
      `| DS Components | ${ar.metrics.dsComponents} |`,
      `| Custom Components | ${ar.metrics.customComponents} |`,
      `| Detached Components | ${ar.metrics.detachedComponents} |`,
    );

    if (ar.categories.length > 0) {
      lines.push(
        '',
        '### Adoption by Category',
        '',
        `| Category | Adopted | Total | Rate |`,
        `|----------|---------|-------|------|`,
        ...ar.categories.map((c) =>
          `| ${mdEscape(c.name)} | ${c.adopted} | ${c.total} | ${c.rate}% |`
        ),
      );
    }

    if (ar.components.length > 0) {
      lines.push(
        '',
        '### Component Usage',
        '',
        `| Component | Library | Instances | Trend |`,
        `|-----------|---------|-----------|-------|`,
        ...ar.components.slice(0, 50).map((c) =>
          `| ${mdEscape(c.name)} | ${mdEscape(c.libraryName)} | ${c.count} | ${c.trend} |`
        ),
      );
      if (ar.components.length > 50) {
        lines.push(``, `> *Showing top 50 of ${ar.components.length} components.*`);
      }
    }
  }

  // ── Audit summary ─────────────────────────────────────────────────
  lines.push(
    '',
    '## Audit Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Nodes Scanned | ${stats.processedNodes.toLocaleString()} |`,
    `| Total Nodes in Scope | ${stats.totalNodes.toLocaleString()} |`,
    `| Nodes with Issues | ${stats.nodesWithIssues.toLocaleString()} |`,
    `| Total Issues | ${summary.totalIssues} |`,
    `| Auto-fixable Issues | ${summary.autoFixable} |`,
    '',
    '### Issues by Category',
    '',
    `| Category | Count | % of Total |`,
    `|----------|-------|------------|`,
    ...Object.entries(summary.byCategory)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => {
        const pct = summary.totalIssues > 0 ? ((count / summary.totalIssues) * 100).toFixed(1) : '0';
        return `| ${capitalize(cat)} | ${count} | ${pct}% |`;
      }),
    '',
    '### Issues by Severity',
    '',
    `| Severity | Count | % of Total |`,
    `|----------|-------|------------|`,
    ...Object.entries(summary.bySeverity)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => {
        const pct = summary.totalIssues > 0 ? ((count / summary.totalIssues) * 100).toFixed(1) : '0';
        return `| ${severityEmoji(sev)} ${capitalize(sev)} | ${count} | ${pct}% |`;
      }),
    '',
  );

  // ── Detailed findings ─────────────────────────────────────────────
  if (result.issues.length > 0) {
    lines.push(
      '---',
      '',
      '## Detailed Findings',
      '',
      `> ${result.issues.length} issue${result.issues.length !== 1 ? 's' : ''} found across ${stats.nodesWithIssues} node${stats.nodesWithIssues !== 1 ? 's' : ''}.`,
      '',
    );

    const grouped = groupIssuesByCategory(result.issues);

    for (const [category, issues] of grouped) {
      lines.push(`### ${capitalize(category)} (${issues.length})`, '');

      for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        lines.push(`#### ${i + 1}. ${mdEscape(issue.message)}`);
        lines.push('');
        lines.push(`| Detail | Value |`);
        lines.push(`|--------|-------|`);
        lines.push(`| Issue ID | \`${mdEscape(issue.id)}\` |`);
        lines.push(`| Severity | ${severityEmoji(issue.severity)} ${capitalize(issue.severity)} |`);
        lines.push(`| Rule | \`${issue.ruleId}\` |`);
        lines.push(`| Node | \`${mdEscape(issue.nodeName)}\` |`);
        lines.push(`| Node Path | \`${mdEscape(issue.nodePath)}\` |`);
        lines.push(`| Node ID | \`${issue.nodeId}\` |`);
        lines.push(`| Property | \`${issue.property}\` |`);
        lines.push(`| Current Value | \`${mdEscape(String(issue.currentValue ?? 'N/A'))}\` |`);

        if (issue.suggestedVariable) {
          lines.push(`| Suggested Variable | \`${mdEscape(issue.suggestedVariable.name)}\` |`);
          lines.push(`| Variable ID | \`${mdEscape(issue.suggestedVariable.id)}\` |`);
          lines.push(`| Variable Collection | ${mdEscape(issue.suggestedVariable.collectionName)} |`);
          lines.push(`| Suggested Value | \`${mdEscape(String(issue.suggestedVariable.resolvedValue))}\` |`);
        }

        lines.push(`| Auto-fixable | ${issue.canAutoFix ? 'Yes' : 'No'} |`);
        lines.push(`| Ignored | ${issue.isIgnored ? 'Yes' : 'No'} |`);
        lines.push('');
      }
    }
  }

  lines.push('---', '', '*Generated by Figxed Design System Audit*');

  return lines.join('\n');
}

// ─── Adoption Exporters ───────────────────────────────────────────────────────

export function exportAdoptionJSON(result: AdoptionResult): string {
  return JSON.stringify(
    {
      generated: new Date().toISOString(),
      metrics: result.metrics,
      scanInfo: result.scanInfo,
      categories: result.categories,
      components: result.components,
    },
    null,
    2
  );
}

export function exportAdoptionCSV(result: AdoptionResult): string {
  const lines: string[] = [];

  // Metrics section
  lines.push('Metric,Value');
  lines.push(`Total Elements,${result.metrics.totalElements}`);
  lines.push(`DS Components,${result.metrics.dsComponents}`);
  lines.push(`Custom Components,${result.metrics.customComponents}`);
  lines.push(`Detached Components,${result.metrics.detachedComponents}`);
  lines.push(`Adoption Rate,${result.metrics.adoptionRate}%`);
  lines.push('');

  // Categories section
  if (result.categories.length > 0) {
    lines.push('Category,Total,Adopted,Rate');
    for (const cat of result.categories) {
      lines.push(`${csvEscape(cat.name)},${cat.total},${cat.adopted},${cat.rate}%`);
    }
    lines.push('');
  }

  // Components section
  if (result.components.length > 0) {
    lines.push('Component,Library,Count,Trend');
    for (const comp of result.components) {
      lines.push(
        `${csvEscape(comp.name)},${csvEscape(comp.libraryName)},${comp.count},${comp.trend}`
      );
    }
  }

  return lines.join('\n');
}

// ─── File Operations ──────────────────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / restricted contexts
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function mdEscape(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function severityEmoji(severity: string): string {
  switch (severity) {
    case 'error': return '🔴';
    case 'warning': return '🟡';
    case 'info': return '🔵';
    default: return '⚪';
  }
}

function groupIssuesByCategory(issues: AuditIssue[]): [string, AuditIssue[]][] {
  const map = new Map<string, AuditIssue[]>();
  for (const issue of issues) {
    const list = map.get(issue.category) ?? [];
    list.push(issue);
    map.set(issue.category, list);
  }
  return Array.from(map.entries()).sort(([, a], [, b]) => b.length - a.length);
}
