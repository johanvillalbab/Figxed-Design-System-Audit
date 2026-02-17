/// <reference types="@figma/plugin-typings" />

import type {
  AuditResult,
  AuditIssue,
  AuditSummary,
  AuditStats,
  AuditCategory,
  FixResult,
  FixAllResult,
} from '../types/audit';
import type { IssueSeverity, AuditConfig, ScanOptions } from '../types/common';
import type { AuditRule } from './types';
import { PaddingWithoutVariableRule } from './rules/PaddingRule';
import { GapWithoutVariableRule } from './rules/GapRule';
import { ColorWithoutVariableRule } from './rules/ColorRule';
import { RadiusWithoutVariableRule } from './rules/RadiusRule';
import { clearSpacingCache } from './matchers/spacingMatcher';
import { clearColorCache } from './matchers/colorMatcher';
import { clearRadiusCache } from './matchers/radiusMatcher';

const BATCH_SIZE = 500;
const PROGRESS_INTERVAL = 100;

interface AuditOptions {
  onProgress?: (current: number, total: number) => void;
}

export class AuditEngine {
  private rules: AuditRule[] = [];
  private issueMap = new Map<string, AuditIssue>();
  private scanOptions: ScanOptions;

  constructor(config?: AuditConfig, scanOptions?: ScanOptions) {
    this.scanOptions = scanOptions ?? { ignoreHiddenLayers: true, groupDetachedComponents: true, includeTextStyles: true };
    this.registerDefaultRules(config);
  }

  private registerDefaultRules(config?: AuditConfig): void {
    const enabledRules = config?.enabledRules;

    const allRules: AuditRule[] = [
      new PaddingWithoutVariableRule(),
      new GapWithoutVariableRule(),
      new ColorWithoutVariableRule(),
      new RadiusWithoutVariableRule(),
    ];

    if (enabledRules && enabledRules.length > 0) {
      this.rules = allRules.filter((r) => enabledRules.includes(r.id));
    } else {
      this.rules = allRules;
    }
  }

  async audit(nodes: SceneNode[], options?: AuditOptions): Promise<AuditResult> {
    this.issueMap.clear();

    // Clear matcher caches so fresh variables are loaded
    clearSpacingCache();
    clearColorCache();
    clearRadiusCache();

    const issues: AuditIssue[] = [];
    const startTime = Date.now();

    // Count total nodes for progress
    const total = this.countNodes(nodes);
    let processed = 0;

    // Process in batches to avoid blocking UI
    const nodeIterator = this.traverseNodes(nodes);
    let batch: SceneNode[] = [];

    for (const node of nodeIterator) {
      batch.push(node);

      if (batch.length >= BATCH_SIZE) {
        await this.processBatch(batch, issues);
        processed += batch.length;
        batch = [];

        if (options?.onProgress && processed % PROGRESS_INTERVAL < BATCH_SIZE) {
          options.onProgress(processed, total);
        }

        // Yield control back to Figma's main thread
        await this.yieldThread();
      }
    }

    // Process remaining
    if (batch.length > 0) {
      await this.processBatch(batch, issues);
      processed += batch.length;
    }

    if (options?.onProgress) {
      options.onProgress(processed, total);
    }

    const duration = Date.now() - startTime;

    // Store issues for later fix operations
    for (const issue of issues) {
      this.issueMap.set(issue.id, issue);
    }

    const summary = this.generateSummary(issues);
    const stats = this.generateStats(total, processed, issues, duration);

    return { issues, summary, stats };
  }

  private async processBatch(nodes: SceneNode[], issues: AuditIssue[]): Promise<void> {
    for (const node of nodes) {
      // Skip hidden layers when configured
      if (this.scanOptions.ignoreHiddenLayers && 'visible' in node && !node.visible) continue;

      // Skip locked layers
      if ('locked' in node && node.locked) continue;

      // Skip nodes ignored via pluginData
      if (this.isNodeFullyIgnored(node)) continue;

      for (const rule of this.rules) {
        // Skip if this specific rule is ignored on this node
        if (this.isRuleIgnoredOnNode(node, rule.id)) continue;

        const ruleIssues = await rule.check(node);
        issues.push(...ruleIssues);
      }
    }
  }

  private isNodeFullyIgnored(node: SceneNode): boolean {
    try {
      const ignored = node.getSharedPluginData('figxed', 'ignored');
      return ignored === 'true';
    } catch {
      return false;
    }
  }

  private isRuleIgnoredOnNode(node: SceneNode, ruleId: string): boolean {
    try {
      const ignoredRules = node.getSharedPluginData('figxed', 'ignoredRules');
      if (!ignoredRules) return false;
      return ignoredRules.split(',').includes(ruleId);
    } catch {
      return false;
    }
  }

  private *traverseNodes(nodes: readonly SceneNode[]): Generator<SceneNode> {
    for (const node of nodes) {
      yield node;
      if ('children' in node) {
        yield* this.traverseNodes((node as ChildrenMixin & SceneNode).children);
      }
    }
  }

  private countNodes(nodes: readonly SceneNode[]): number {
    let count = 0;
    for (const node of nodes) {
      count++;
      if ('children' in node) {
        count += this.countNodes((node as ChildrenMixin & SceneNode).children);
      }
    }
    return count;
  }

  private yieldThread(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  // ─── Fix Operations ──────────────────────────────────────────────────────

  async fixIssue(issueId: string): Promise<FixResult> {
    const issue = this.issueMap.get(issueId);
    if (!issue) {
      return { issueId, success: false, error: 'Issue not found' };
    }

    if (!issue.canAutoFix || !issue.suggestedVariable) {
      return { issueId, success: false, error: 'Issue cannot be auto-fixed' };
    }

    const rule = this.rules.find((r) => r.id === issue.ruleId);
    if (!rule || !rule.autoFix) {
      return { issueId, success: false, error: 'Rule does not support auto-fix' };
    }

    const node = await figma.getNodeByIdAsync(issue.nodeId) as SceneNode | null;
    if (!node) {
      return { issueId, success: false, error: 'Node no longer exists' };
    }

    try {
      await rule.autoFix(node, issue);
      this.issueMap.delete(issueId);
      return { issueId, success: true };
    } catch (error) {
      return {
        issueId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during fix',
      };
    }
  }

  async fixAll(category?: string): Promise<FixAllResult> {
    const issues = Array.from(this.issueMap.values()).filter((issue) => {
      if (!issue.canAutoFix) return false;
      if (category && category !== 'all' && issue.category !== category) return false;
      return true;
    });

    const results: FixResult[] = [];

    for (const issue of issues) {
      results.push(await this.fixIssue(issue.id));
    }

    return {
      total: results.length,
      fixed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  // ─── Summary / Stats ─────────────────────────────────────────────────────

  private generateSummary(issues: AuditIssue[]): AuditSummary {
    const byCategory = this.emptyCategoryMap();
    const bySeverity = this.emptySeverityMap();
    let autoFixable = 0;

    for (const issue of issues) {
      byCategory[issue.category]++;
      bySeverity[issue.severity]++;
      if (issue.canAutoFix) autoFixable++;
    }

    return {
      totalIssues: issues.length,
      byCategory,
      bySeverity,
      autoFixable,
    };
  }

  private generateStats(
    totalNodes: number,
    processedNodes: number,
    issues: AuditIssue[],
    duration: number
  ): AuditStats {
    const byCategory = this.emptyCategoryMap();
    const bySeverity = this.emptySeverityMap();

    for (const issue of issues) {
      byCategory[issue.category]++;
      bySeverity[issue.severity]++;
    }

    // Count unique nodes that have at least one issue
    const nodesWithIssues = new Set(issues.map((i) => i.nodeId)).size;

    return {
      totalNodes,
      processedNodes,
      totalIssues: issues.length,
      nodesWithIssues,
      byCategory,
      bySeverity,
      duration,
    };
  }

  private emptyCategoryMap(): Record<AuditCategory, number> {
    return { spacing: 0, color: 0, geometry: 0, typography: 0, effects: 0, layout: 0 };
  }

  private emptySeverityMap(): Record<IssueSeverity, number> {
    return { error: 0, warning: 0, info: 0 };
  }
}
