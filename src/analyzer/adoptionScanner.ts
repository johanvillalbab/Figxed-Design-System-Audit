/// <reference types="@figma/plugin-typings" />

import type {
  AdoptionResult,
  AdoptionMetrics,
  ComponentUsage,
  CategoryMetrics,
  NonAdoptedItem,
  ScanInfo,
  LoadedLibraryData,
} from '../types/adoption';
import type { ScanOptions } from '../types/common';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressCallback {
  (current: number, total: number): void;
}

const MAX_NON_ADOPTED = 500;

interface ScanContext {
  // Component tracking
  dsInstances: number;
  detachedInstances: number;
  customInstances: number;
  componentCounts: Map<string, { name: string; libraryName: string; count: number }>;

  // Color tracking
  totalColorProps: number;
  tokenizedColorProps: number;

  // Spacing tracking
  totalSpacingProps: number;
  tokenizedSpacingProps: number;

  // Text style tracking
  totalTextNodes: number;
  styledTextNodes: number;

  // Radius tracking
  totalRadiusProps: number;
  tokenizedRadiusProps: number;

  // Non-adopted item tracking
  nonAdoptedItems: NonAdoptedItem[];
  nonAdoptedTracker: Set<string>;

  // General
  totalNodes: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

const SPACING_PROPS = [
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'itemSpacing',
  'counterAxisSpacing',
] as const;

const RADIUS_PROPS = [
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
] as const;

// ─── Scanner ──────────────────────────────────────────────────────────────────

export class AdoptionScanner {
  private scanOptions: ScanOptions;
  private libraryComponentKeys: Set<string>;
  private libraryComponentNames: Set<string>;

  constructor(scanOptions?: ScanOptions, loadedLibrary?: LoadedLibraryData | null) {
    this.scanOptions = scanOptions ?? {
      ignoreHiddenLayers: true,
      groupDetachedComponents: true,
      includeTextStyles: true,
    };

    // Build lookup sets from the loaded library for component matching
    this.libraryComponentKeys = new Set<string>();
    this.libraryComponentNames = new Set<string>();
    if (loadedLibrary) {
      for (const comp of loadedLibrary.components) {
        if (comp.key) this.libraryComponentKeys.add(comp.key);
        if (comp.name) this.libraryComponentNames.add(comp.name);
      }
    }
  }

  async scan(
    nodes: SceneNode[],
    scope: string,
    onProgress?: ProgressCallback
  ): Promise<AdoptionResult> {
    const startTime = Date.now();

    // Flatten all nodes via recursive traversal
    const allNodes = this.collectNodes(nodes);

    const ctx: ScanContext = {
      dsInstances: 0,
      detachedInstances: 0,
      customInstances: 0,
      componentCounts: new Map(),
      totalColorProps: 0,
      tokenizedColorProps: 0,
      totalSpacingProps: 0,
      tokenizedSpacingProps: 0,
      totalTextNodes: 0,
      styledTextNodes: 0,
      totalRadiusProps: 0,
      tokenizedRadiusProps: 0,
      nonAdoptedItems: [],
      nonAdoptedTracker: new Set(),
      totalNodes: allNodes.length,
    };

    // Process in batches
    for (let i = 0; i < allNodes.length; i += BATCH_SIZE) {
      const batch = allNodes.slice(i, i + BATCH_SIZE);
      await this.processBatch(batch, ctx);

      onProgress?.(Math.min(i + BATCH_SIZE, allNodes.length), allNodes.length);

      // Yield to main thread between batches
      if (i + BATCH_SIZE < allNodes.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    const duration = Date.now() - startTime;
    return this.buildResult(ctx, scope, duration);
  }

  // ─── Node Collection ──────────────────────────────────────────────────

  private collectNodes(roots: SceneNode[]): SceneNode[] {
    const result: SceneNode[] = [];
    const stack: SceneNode[] = [...roots];

    while (stack.length > 0) {
      const node = stack.pop()!;

      // Skip hidden layers if configured
      if (this.scanOptions.ignoreHiddenLayers && 'visible' in node && !node.visible) {
        continue;
      }

      // Skip locked nodes
      if ('locked' in node && node.locked) continue;

      result.push(node);

      // Recurse into children (but NOT into instances — their internals are library-controlled)
      if ('children' in node && node.type !== 'INSTANCE') {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i] as SceneNode);
        }
      }
    }

    return result;
  }

  // ─── Batch Processing ─────────────────────────────────────────────────

  private async processBatch(nodes: SceneNode[], ctx: ScanContext): Promise<void> {
    for (const node of nodes) {
      await this.classifyNode(node, ctx);
    }
  }

  private async classifyNode(node: SceneNode, ctx: ScanContext): Promise<void> {
    // 1. Component instance classification
    if (node.type === 'INSTANCE') {
      await this.classifyInstance(node, ctx);
      try {
        const mc = await node.getMainComponentAsync();
        if (mc && this.isLibraryComponent(mc)) return;
      } catch {
        // getMainComponentAsync can throw — fall through to checks below
      }
    }

    // 2. Text style tracking
    if (node.type === 'TEXT' && this.scanOptions.includeTextStyles) {
      this.trackTextStyle(node, ctx);
    }

    // 3. Color variable tracking (fills & strokes)
    if ('fills' in node) {
      this.trackColorUsage(node, ctx);
    }

    // 4. Spacing variable tracking (auto-layout nodes)
    if ('layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE') {
      this.trackSpacingUsage(node as FrameNode, ctx);
    }

    // 5. Radius variable tracking
    if ('cornerRadius' in node) {
      this.trackRadiusUsage(node, ctx);
    }
  }

  // ─── Non-adopted tracking ─────────────────────────────────────────────

  private trackNonAdopted(ctx: ScanContext, item: NonAdoptedItem): void {
    if (ctx.nonAdoptedItems.length >= MAX_NON_ADOPTED) return;
    const key = `${item.nodeId}:${item.category}`;
    if (ctx.nonAdoptedTracker.has(key)) return;
    ctx.nonAdoptedTracker.add(key);
    ctx.nonAdoptedItems.push(item);
  }

  // ─── Instance Classification ──────────────────────────────────────────

  private isLibraryComponent(comp: ComponentNode): boolean {
    // 1. Remote component → always considered DS
    if (comp.remote) return true;

    // 2. Match against the loaded library by key
    if (comp.key && this.libraryComponentKeys.has(comp.key)) return true;

    // 3. Match against the loaded library by name (covers same-file or
    //    re-published scenarios where keys may differ)
    const parentSet = comp.parent;
    const matchName =
      parentSet && parentSet.type === 'COMPONENT_SET'
        ? parentSet.name
        : comp.name;

    if (this.libraryComponentNames.has(matchName)) return true;
    if (this.libraryComponentNames.has(comp.name)) return true;

    return false;
  }

  private async classifyInstance(node: InstanceNode, ctx: ScanContext): Promise<void> {
    let mainComp: ComponentNode | null = null;
    try {
      mainComp = await node.getMainComponentAsync();
    } catch {
      // getMainComponentAsync can throw if the component is unavailable
    }

    if (!mainComp) {
      ctx.detachedInstances++;
      this.trackNonAdopted(ctx, {
        nodeId: node.id,
        nodeName: node.name,
        category: 'component',
        reason: 'Detached component',
      });
      return;
    }

    if (this.isLibraryComponent(mainComp)) {
      ctx.dsInstances++;

      const compName = mainComp.name;
      const parentSet = mainComp.parent;
      const libraryName =
        parentSet && parentSet.type === 'COMPONENT_SET'
          ? parentSet.name
          : compName;

      const key = `${libraryName}::${compName}`;
      const existing = ctx.componentCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        ctx.componentCounts.set(key, {
          name: compName,
          libraryName,
          count: 1,
        });
      }
    } else {
      ctx.customInstances++;
      this.trackNonAdopted(ctx, {
        nodeId: node.id,
        nodeName: node.name,
        category: 'component',
        reason: 'Local component (not from library)',
      });
    }
  }

  // ─── Text Style Tracking ──────────────────────────────────────────────

  private trackTextStyle(node: TextNode, ctx: ScanContext): void {
    ctx.totalTextNodes++;

    const styleId = node.textStyleId;
    if (styleId && typeof styleId === 'string' && styleId !== '') {
      ctx.styledTextNodes++;
    } else if (node.boundVariables && Object.keys(node.boundVariables).length > 0) {
      ctx.styledTextNodes++;
    } else {
      this.trackNonAdopted(ctx, {
        nodeId: node.id,
        nodeName: node.name,
        category: 'text-style',
        reason: 'Text without style',
      });
    }
  }

  // ─── Color Usage Tracking ─────────────────────────────────────────────

  private trackColorUsage(node: SceneNode & MinimalFillsMixin, ctx: ScanContext): void {
    const fills = node.fills;
    if (!Array.isArray(fills)) return;

    let hasNonTokenized = false;

    for (let i = 0; i < fills.length; i++) {
      const fill = fills[i];
      if (fill.type !== 'SOLID') continue;

      ctx.totalColorProps++;
      let tokenized = false;

      const boundVars = node.boundVariables;
      if (boundVars) {
        const fillBindings = boundVars.fills;
        if (Array.isArray(fillBindings) && fillBindings[i]) {
          ctx.tokenizedColorProps++;
          tokenized = true;
        }
      }

      if (!tokenized && 'fillStyleId' in node) {
        const styleId = (node as GeometryMixin & { fillStyleId: string | typeof figma.mixed }).fillStyleId;
        if (styleId && typeof styleId === 'string' && styleId !== '') {
          ctx.tokenizedColorProps++;
          tokenized = true;
        }
      }

      if (!tokenized) hasNonTokenized = true;
    }

    if ('strokes' in node) {
      const strokes = (node as MinimalStrokesMixin).strokes;
      if (Array.isArray(strokes)) {
        for (const stroke of strokes) {
          if (stroke.type !== 'SOLID') continue;
          ctx.totalColorProps++;
          let tokenized = false;

          const boundVars = node.boundVariables;
          if (boundVars && boundVars.strokes) {
            const strokeBindings = boundVars.strokes;
            if (Array.isArray(strokeBindings) && strokeBindings.length > 0) {
              ctx.tokenizedColorProps++;
              tokenized = true;
            }
          }

          if (!tokenized && 'strokeStyleId' in node) {
            const styleId = (node as { strokeStyleId: string | typeof figma.mixed }).strokeStyleId;
            if (styleId && typeof styleId === 'string' && styleId !== '') {
              ctx.tokenizedColorProps++;
              tokenized = true;
            }
          }

          if (!tokenized) hasNonTokenized = true;
        }
      }
    }

    if (hasNonTokenized) {
      this.trackNonAdopted(ctx, {
        nodeId: node.id,
        nodeName: node.name,
        category: 'color',
        reason: 'Color without variable or style',
      });
    }
  }

  // ─── Spacing Usage Tracking ───────────────────────────────────────────

  private trackSpacingUsage(node: FrameNode, ctx: ScanContext): void {
    const boundVars = node.boundVariables;
    let hasNonTokenized = false;

    for (const prop of SPACING_PROPS) {
      if (!(prop in node)) continue;
      const value = (node as unknown as Record<string, unknown>)[prop];
      if (typeof value !== 'number' || value === 0) continue;

      ctx.totalSpacingProps++;

      let tokenized = false;
      if (boundVars) {
        const binding = (boundVars as unknown as Record<string, VariableAlias | undefined>)[prop];
        if (binding) {
          ctx.tokenizedSpacingProps++;
          tokenized = true;
        }
      }

      if (!tokenized) hasNonTokenized = true;
    }

    if (hasNonTokenized) {
      this.trackNonAdopted(ctx, {
        nodeId: node.id,
        nodeName: node.name,
        category: 'spacing',
        reason: 'Spacing without variable',
      });
    }
  }

  // ─── Radius Usage Tracking ────────────────────────────────────────────

  private trackRadiusUsage(node: SceneNode, ctx: ScanContext): void {
    const boundVars = node.boundVariables;
    const bv = boundVars as unknown as Record<string, VariableAlias | undefined> | undefined;
    const rectNode = node as RectangleNode;

    const hasRadius =
      'cornerRadius' in rectNode &&
      ((typeof rectNode.cornerRadius === 'number' && rectNode.cornerRadius > 0) ||
        rectNode.cornerRadius === figma.mixed);

    if (!hasRadius) return;

    // Check the unified cornerRadius binding first
    if (bv?.cornerRadius) {
      ctx.totalRadiusProps++;
      ctx.tokenizedRadiusProps++;
      return;
    }

    // Check individual corner bindings (covers both mixed and uniform cases
    // where the designer bound each corner separately to the same variable)
    let individualTotal = 0;
    let individualTokenized = 0;

    for (const prop of RADIUS_PROPS) {
      const value = (rectNode as unknown as Record<string, unknown>)[prop];
      if (typeof value !== 'number' || value === 0) continue;

      individualTotal++;
      if (bv?.[prop]) {
        individualTokenized++;
      }
    }

    if (individualTotal > 0) {
      ctx.totalRadiusProps += individualTotal;
      ctx.tokenizedRadiusProps += individualTokenized;

      if (individualTokenized < individualTotal) {
        this.trackNonAdopted(ctx, {
          nodeId: node.id,
          nodeName: node.name,
          category: 'radius',
          reason: 'Radius without variable',
        });
      }
      return;
    }

    // Uniform radius with no individual corners detected — count as 1 prop
    if (typeof rectNode.cornerRadius === 'number' && rectNode.cornerRadius > 0) {
      ctx.totalRadiusProps++;
      this.trackNonAdopted(ctx, {
        nodeId: node.id,
        nodeName: node.name,
        category: 'radius',
        reason: 'Radius without variable',
      });
    }
  }

  // ─── Result Building ──────────────────────────────────────────────────

  private buildResult(ctx: ScanContext, scope: string, duration: number): AdoptionResult {
    const totalInstances = ctx.dsInstances + ctx.detachedInstances + ctx.customInstances;

    // Build category metrics
    const categories: CategoryMetrics[] = [];

    if (totalInstances > 0) {
      categories.push({
        name: 'Components',
        total: totalInstances,
        adopted: ctx.dsInstances,
        rate: Math.round((ctx.dsInstances / totalInstances) * 1000) / 10,
      });
    }

    if (ctx.totalColorProps > 0) {
      categories.push({
        name: 'Colors',
        total: ctx.totalColorProps,
        adopted: ctx.tokenizedColorProps,
        rate: Math.round((ctx.tokenizedColorProps / ctx.totalColorProps) * 1000) / 10,
      });
    }

    if (ctx.totalSpacingProps > 0) {
      categories.push({
        name: 'Spacing',
        total: ctx.totalSpacingProps,
        adopted: ctx.tokenizedSpacingProps,
        rate: Math.round((ctx.tokenizedSpacingProps / ctx.totalSpacingProps) * 1000) / 10,
      });
    }

    if (ctx.totalTextNodes > 0 && this.scanOptions.includeTextStyles) {
      categories.push({
        name: 'Text Styles',
        total: ctx.totalTextNodes,
        adopted: ctx.styledTextNodes,
        rate: Math.round((ctx.styledTextNodes / ctx.totalTextNodes) * 1000) / 10,
      });
    }

    if (ctx.totalRadiusProps > 0) {
      categories.push({
        name: 'Radius',
        total: ctx.totalRadiusProps,
        adopted: ctx.tokenizedRadiusProps,
        rate: Math.round((ctx.tokenizedRadiusProps / ctx.totalRadiusProps) * 1000) / 10,
      });
    }

    // Holistic adoption rate across ALL categories
    const totalChecked = categories.reduce((s, c) => s + c.total, 0);
    const totalAdopted = categories.reduce((s, c) => s + c.adopted, 0);

    const metrics: AdoptionMetrics = {
      totalElements: ctx.totalNodes,
      dsComponents: ctx.dsInstances,
      customComponents: ctx.customInstances,
      detachedComponents: ctx.detachedInstances,
      adoptionRate:
        totalChecked > 0
          ? Math.round((totalAdopted / totalChecked) * 1000) / 10
          : 0,
    };

    // Build component usage list sorted by count
    const components: ComponentUsage[] = Array.from(ctx.componentCounts.values())
      .map((c) => ({
        name: c.name,
        libraryName: c.libraryName,
        count: c.count,
        trend: 'stable' as const,
      }))
      .sort((a, b) => b.count - a.count);

    const scanInfo: ScanInfo = {
      scope,
      totalNodes: ctx.totalNodes,
      duration,
      timestamp: Date.now(),
    };

    return { metrics, components, categories, nonAdoptedItems: ctx.nonAdoptedItems, scanInfo };
  }
}
