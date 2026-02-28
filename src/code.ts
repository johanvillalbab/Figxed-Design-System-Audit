/// <reference types="@figma/plugin-typings" />

import type { ToCodeMessage, ToUIMessage } from './types/messages';
import type { AuditConfig, ScanOptions } from './types/common';
import type {
  LibraryInfo,
  DetectedLibrary,
  LoadedLibraryData,
  LoadedVariableInfo,
  LoadedCollectionInfo,
  LoadedComponentInfo,
  LoadedStyleInfo,
  LoadedLibrarySummary,
  LibraryScanResult,
  ScannedLibrary,
  ScannedComponent,
  ScannedComponentProperty,
} from './types/adoption';
import { AuditEngine } from './audit/engine';
import { AdoptionScanner } from './analyzer/adoptionScanner';

// ─── Plugin Initialization ───────────────────────────────────────────────────

// Handle menu commands — for commands that don't need the UI panel,
// we could skip showUI, but our commands all benefit from the panel.
const command = figma.command;

figma.showUI(__html__, {
  width: 380,
  height: 600,
  themeColors: true,
  title: 'Figxed Design System Audit',
});

// ─── State ───────────────────────────────────────────────────────────────────

let isScanning = false;
let auditEngine: AuditEngine | null = null;
let lastAuditScope: 'selection' | 'page' | 'file' | 'pages' = 'page';
let lastSelectionNodeIds: string[] = [];
let lastSelectedPageIds: string[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function postToUI(message: ToUIMessage): void {
  figma.ui.postMessage(message);
}

function notifyUI(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  postToUI({ type: 'NOTIFY', payload: { message, type } });
}

/** Show a native Figma toast notification for important actions */
function notifyNative(message: string, options?: NotificationOptions): void {
  figma.notify(message, options);
}

/** Handle menu/relaunch commands */
function handleCommand(cmd: string): void {
  switch (cmd) {
    case 'audit-selection':
      figma.ui.postMessage({
        pluginMessage: { type: 'START_AUDIT', payload: { scope: 'selection' } },
      });
      // Trigger audit directly since the UI might not be ready to relay
      triggerAudit('selection');
      break;
    case 'audit-page':
      triggerAudit('page');
      break;
    case 'audit-file':
      triggerAudit('file');
      break;
    case 'reaudit':
      triggerAudit(lastAuditScope);
      break;
    default:
      break;
  }
}

/** Trigger an audit programmatically (from menu/relaunch command) */
async function triggerAudit(scope: 'selection' | 'page' | 'file' | 'pages', pageIds?: string[]): Promise<void> {
  if (isScanning) return;

  isScanning = true;
  lastAuditScope = scope;
  if (pageIds) lastSelectedPageIds = pageIds;

  try {
    let nodes: SceneNode[] = [];

    switch (scope) {
      case 'selection': {
        nodes = [...figma.currentPage.selection];
        if (nodes.length === 0 && lastSelectionNodeIds.length > 0) {
          for (const id of lastSelectionNodeIds) {
            const node = await figma.getNodeByIdAsync(id);
            if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
              nodes.push(node as SceneNode);
            }
          }
        }
        if (nodes.length === 0) {
          notifyNative('No elements selected');
          isScanning = false;
          return;
        }
        lastSelectionNodeIds = nodes.map((n) => n.id);
        break;
      }
      case 'page':
        nodes = [...figma.currentPage.children];
        break;
      case 'pages': {
        const targetIds = pageIds ?? lastSelectedPageIds;
        if (targetIds.length === 0) {
          notifyNative('No pages selected');
          isScanning = false;
          return;
        }
        const allPages = figma.root.children;
        const selectedPages = allPages.filter((p) => targetIds.includes(p.id));
        for (let i = 0; i < selectedPages.length; i++) {
          const pg = selectedPages[i];
          postToUI({
            type: 'PROGRESS_UPDATE',
            payload: {
              current: i,
              total: selectedPages.length,
              label: `Loading page "${pg.name}" (${i + 1}/${selectedPages.length})...`,
            },
          });
          await pg.loadAsync();
          nodes.push(...pg.children);
        }
        break;
      }
      case 'file': {
        const pages = figma.root.children;
        for (let i = 0; i < pages.length; i++) {
          const pg = pages[i];
          postToUI({
            type: 'PROGRESS_UPDATE',
            payload: {
              current: i,
              total: pages.length,
              label: `Loading page "${pg.name}" (${i + 1}/${pages.length})...`,
            },
          });
          await pg.loadAsync();
          nodes.push(...pg.children);
        }
        break;
      }
    }

    const config = loadAuditConfig();
    const scanOptions = loadScanOptions();
    auditEngine = new AuditEngine(config, scanOptions);

    const result = await auditEngine.audit(nodes, {
      onProgress: (current, total) => {
        postToUI({
          type: 'PROGRESS_UPDATE',
          payload: { current, total, label: `Auditing ${scope}...` },
        });
      },
    });

    postToUI({ type: 'AUDIT_RESULTS', payload: result });

    // Run adoption scan alongside the audit using the same nodes
    try {
      const loadedLib = await restoreLoadedLibrary();
      const adoptionScanner = new AdoptionScanner(scanOptions, loadedLib);
      const adoptionResult = await adoptionScanner.scan(nodes, scope);
      postToUI({ type: 'ADOPTION_RESULTS', payload: adoptionResult });
    } catch {
      // Adoption scan failed silently
    }

    // Set relaunch data so the "Re-audit" button appears in the plugin menu
    figma.root.setRelaunchData({ reaudit: '' });

    const issueWord = result.summary.totalIssues === 1 ? 'issue' : 'issues';
    const msg = `Audit complete. ${result.summary.totalIssues} ${issueWord} found.`;
    notifyUI(msg, result.summary.totalIssues === 0 ? 'success' : 'info');
    notifyNative(msg);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Audit failed';
    postToUI({ type: 'ERROR', payload: { message } });
    notifyNative(message, { error: true });
  } finally {
    isScanning = false;
  }
}

function getSelectedNodeIds(): string[] {
  return figma.currentPage.selection.map((n) => n.id);
}

// ─── Library Detection ────────────────────────────────────────────────────────

async function detectLibraries(): Promise<DetectedLibrary[]> {
  const libraryMap = new Map<string, DetectedLibrary>();

  // 1. Get variable collections from team library API
  try {
    const varCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    for (const col of varCollections) {
      const existing = libraryMap.get(col.libraryName);
      if (existing) {
        existing.variableCollections.push(col.name);
      } else {
        libraryMap.set(col.libraryName, {
          id: col.libraryName,
          name: col.libraryName,
          variableCollections: [col.name],
          componentInstances: 0,
          styleCount: 0,
          enabled: true,
        });
      }
    }
  } catch {
    // teamLibrary API not available
  }

  // 2. Scan current page for remote component instances
  //    Group by key prefix to identify unique library sources
  const keyPrefixToLib = new Map<string, string>(); // keyPrefix -> libraryName (for matching)
  const keyPrefixCounts = new Map<string, number>();

  const stack: SceneNode[] = [...figma.currentPage.children];
  while (stack.length > 0) {
    const node = stack.pop()!;

    if (node.type === 'INSTANCE') {
      try {
        const mc = await node.getMainComponentAsync();
        if (mc && mc.remote) {
          const keyPrefix = mc.key.split(':')[0];
          keyPrefixCounts.set(keyPrefix, (keyPrefixCounts.get(keyPrefix) ?? 0) + 1);
        }
      } catch {
        // getMainComponentAsync can throw for deleted/unavailable components
      }
    }

    // Recurse into children but NOT into instances
    if ('children' in node && node.type !== 'INSTANCE') {
      for (let i = (node as FrameNode).children.length - 1; i >= 0; i--) {
        stack.push((node as FrameNode).children[i] as SceneNode);
      }
    }
  }

  // 3. Try to match component key prefixes with known libraries
  //    If no match, create a new "External" entry per prefix
  let externalIdx = 0;
  for (const [keyPrefix, count] of keyPrefixCounts) {
    // Check if any known library matches this prefix
    let matched = false;
    for (const [libName, lib] of libraryMap) {
      // Heuristic: if this is the first/only prefix, assign to first library
      // In practice, projects typically use 1-3 libraries
      if (lib.componentInstances === 0 && !matched) {
        lib.componentInstances += count;
        keyPrefixToLib.set(keyPrefix, libName);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // New library source not from variable collections
      externalIdx++;
      const name = libraryMap.size === 0
        ? 'Team Library'
        : `External Library${externalIdx > 1 ? ` ${externalIdx}` : ''}`;

      libraryMap.set(`_ext_${keyPrefix}`, {
        id: `_ext_${keyPrefix}`,
        name,
        variableCollections: [],
        componentInstances: count,
        styleCount: 0,
        enabled: true,
      });
    }
  }

  // 4. Scan for remote styles (paint styles, text styles, effect styles)
  try {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    const textStyles = await figma.getLocalTextStylesAsync();
    const effectStyles = await figma.getLocalEffectStylesAsync();

    const allLocalStyles = [...paintStyles, ...textStyles, ...effectStyles];
    // Local styles are created in this file — they're not "from a library"
    // We want to count styles that come from libraries (remote)
    // Unfortunately getLocalXStylesAsync only returns LOCAL styles

    // Instead, scan nodes for applied remote styles
    const remoteStyleIds = new Set<string>();
    const styleStack: SceneNode[] = [...figma.currentPage.children];
    let styleNodeCount = 0;
    const MAX_STYLE_SCAN = 5000; // limit scan

    while (styleStack.length > 0 && styleNodeCount < MAX_STYLE_SCAN) {
      const sNode = styleStack.pop()!;
      styleNodeCount++;

      // Check fill/stroke styles
      if ('fillStyleId' in sNode) {
        const fId = (sNode as GeometryMixin).fillStyleId;
        if (typeof fId === 'string' && fId !== '') remoteStyleIds.add(fId);
      }
      if ('strokeStyleId' in sNode) {
        const sId = (sNode as GeometryMixin).strokeStyleId;
        if (typeof sId === 'string' && sId !== '') remoteStyleIds.add(sId);
      }
      // Text styles
      if (sNode.type === 'TEXT') {
        const tId = sNode.textStyleId;
        if (typeof tId === 'string' && tId !== '') remoteStyleIds.add(tId);
      }
      // Effect styles
      if ('effectStyleId' in sNode) {
        const eId = (sNode as BlendMixin).effectStyleId;
        if (typeof eId === 'string' && eId !== '') remoteStyleIds.add(eId);
      }

      if ('children' in sNode && sNode.type !== 'INSTANCE') {
        for (let i = (sNode as FrameNode).children.length - 1; i >= 0; i--) {
          styleStack.push((sNode as FrameNode).children[i] as SceneNode);
        }
      }
    }

    // Check which styles are remote (from a library)
    let remoteStyleCount = 0;
    for (const styleId of remoteStyleIds) {
      try {
        const style = await figma.getStyleByIdAsync(styleId);
        if (style && style.remote) {
          remoteStyleCount++;
        }
      } catch {
        // style not found
      }
    }

    // Distribute style count to the first library (or a generic entry)
    if (remoteStyleCount > 0) {
      const firstLib = libraryMap.values().next().value;
      if (firstLib) {
        firstLib.styleCount += remoteStyleCount;
      } else {
        libraryMap.set('_styles', {
          id: '_styles',
          name: 'Team Library',
          variableCollections: [],
          componentInstances: 0,
          styleCount: remoteStyleCount,
          enabled: true,
        });
      }
    }
  } catch {
    // Style detection failed
  }

  return Array.from(libraryMap.values());
}

// ─── Deep Library Scan (Detect Libraries) ────────────────────────────────────
// Walks the node tree, groups INSTANCE nodes by their source library,
// and for each component collects variant/component properties and their values.
//
// Library origin detection strategy:
// 1. For each remote INSTANCE, access mainComponent to read its key
// 2. Group components by their key prefix (file-level identifier)
// 3. Resolve library names using:
//    a) teamLibrary API (variable collections carry the libraryName)
//    b) Cross-referencing key prefixes from variable collections with component keys
//    c) Component name hierarchy analysis (common "/" prefix)
//    d) Fallback to numbered external library names

/** Extract the file-level fingerprint from a component or collection key.
 *  Variable collection keys look like "VariableCollectionId:HASH/localId:mode"
 *  while component keys look like "HASH:nodeId" or just "HASH".
 *  Both embed a long hex file hash — we extract that for reliable matching. */
function extractKeyFingerprint(key: string): string {
  const hexMatch = key.match(/[a-f0-9]{20,}/i);
  if (hexMatch) return hexMatch[0].toLowerCase();

  for (const sep of [';', ':', '/']) {
    const idx = key.indexOf(sep);
    if (idx > 4) return key.substring(0, idx);
  }
  return key;
}

/** Find the longest common "/" prefix among component names (e.g. "DS / Button", "DS / Card" → "DS"). */
function inferLibraryNameFromComponents(
  names: string[],
): string | null {
  if (names.length === 0) return null;

  // Extract root segments (before the first "/")
  const roots = names.map((n) => {
    const slashIdx = n.indexOf('/');
    return slashIdx > 0 ? n.substring(0, slashIdx).trim() : null;
  });

  // Check if at least 60% share the same root prefix
  const rootCounts = new Map<string, number>();
  for (const r of roots) {
    if (r) rootCounts.set(r, (rootCounts.get(r) ?? 0) + 1);
  }

  let bestRoot: string | null = null;
  let bestCount = 0;
  for (const [root, count] of rootCounts) {
    if (count > bestCount) {
      bestRoot = root;
      bestCount = count;
    }
  }

  if (bestRoot && bestCount >= names.length * 0.5) {
    return bestRoot;
  }
  return null;
}

async function scanLibraries(
  scope: 'selection' | 'page' | 'file' | 'pages',
  pageIds?: string[],
): Promise<LibraryScanResult> {
  const startTime = Date.now();

  // ── 0. Collect nodes from the requested scope ────────────────────────
  let nodes: SceneNode[] = [];
  switch (scope) {
    case 'selection':
      nodes = [...figma.currentPage.selection];
      break;
    case 'page':
      nodes = [...figma.currentPage.children];
      break;
    case 'pages': {
      const targetIds = pageIds ?? [];
      const allPages = figma.root.children;
      const selectedPages = allPages.filter((p) => targetIds.includes(p.id));
      for (let i = 0; i < selectedPages.length; i++) {
        const pg = selectedPages[i];
        postToUI({
          type: 'PROGRESS_UPDATE',
          payload: {
            current: i,
            total: selectedPages.length,
            label: `Loading page "${pg.name}" (${i + 1}/${selectedPages.length})...`,
          },
        });
        await pg.loadAsync();
        nodes.push(...pg.children);
      }
      break;
    }
    case 'file': {
      const pages = figma.root.children;
      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i];
        postToUI({
          type: 'PROGRESS_UPDATE',
          payload: {
            current: i,
            total: pages.length,
            label: `Loading page "${pg.name}" (${i + 1}/${pages.length})...`,
          },
        });
        await pg.loadAsync();
        nodes.push(...pg.children);
      }
      break;
    }
  }

  // ── 1. Build fingerprint → libraryName map from team library API ─────
  // Variable collections carry a .libraryName — we extract the key
  // fingerprint from each collection key so we can cross-reference later.
  const fingerprintToLibName = new Map<string, string>();
  const knownLibNames = new Set<string>();

  try {
    const varCollections =
      await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    for (const col of varCollections) {
      const fp = extractKeyFingerprint(col.key);
      fingerprintToLibName.set(fp, col.libraryName);
      knownLibNames.add(col.libraryName);
    }
  } catch {
    // teamLibrary API not available (e.g. personal files)
  }

  // ── 2. Walk the node tree, collect remote instances ──────────────────
  // fingerprint → componentKey → { name, key, instances }
  const libGroups = new Map<
    string,
    Map<string, { name: string; key: string; instances: InstanceNode[] }>
  >();

  let totalNodes = 0;
  let totalInstances = 0;

  const stack: SceneNode[] = [...nodes];
  const BATCH_SIZE = 800;
  let processed = 0;

  while (stack.length > 0) {
    const node = stack.pop()!;
    totalNodes++;
    processed++;

    if (processed % BATCH_SIZE === 0) {
      postToUI({
        type: 'PROGRESS_UPDATE',
        payload: {
          current: processed,
          total: processed + stack.length,
          label: `Scanning nodes... (${processed} processed)`,
        },
      });
      await new Promise((r) => setTimeout(r, 0));
    }

    if (node.type === 'INSTANCE') {
      totalInstances++;
      try {
        const mc = await node.getMainComponentAsync();
        if (mc && mc.remote) {
          const parent = mc.parent;
          const isVariant = parent?.type === 'COMPONENT_SET';
          const compKey = isVariant ? parent.key : mc.key;
          const compName = isVariant ? parent.name : mc.name;

          const fingerprint = extractKeyFingerprint(mc.key);

          if (!libGroups.has(fingerprint)) {
            libGroups.set(fingerprint, new Map());
          }
          const compMap = libGroups.get(fingerprint)!;
          if (!compMap.has(compKey)) {
            compMap.set(compKey, { name: compName, key: compKey, instances: [] });
          }
          compMap.get(compKey)!.instances.push(node);
        }
      } catch {
        // getMainComponentAsync can throw for deleted/unavailable components
      }
    }

    // Recurse into ALL children (including instances — their children may also use library components)
    if ('children' in node) {
      for (let i = (node as FrameNode).children.length - 1; i >= 0; i--) {
        stack.push((node as FrameNode).children[i] as SceneNode);
      }
    }
  }

  // ── 2b. Build collectionKey → libraryName map for bound-variable resolution
  const collectionKeyToLibName = new Map<string, string>();
  try {
    const teamCols =
      await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    for (const tc of teamCols) {
      collectionKeyToLibName.set(tc.key, tc.libraryName);
    }
  } catch {
    // already attempted above — ignore
  }

  // ── 3. Resolve library names for each fingerprint group ──────────────
  const libraries: ScannedLibrary[] = [];
  let externalIdx = 0;

  for (const [fingerprint, compMap] of libGroups) {
    // Strategy A: Direct fingerprint match against team library API
    let resolvedName = fingerprintToLibName.get(fingerprint);

    // Strategy B: Trace bound variables on instances back to a library name
    if (!resolvedName && collectionKeyToLibName.size > 0) {
      const sampleInstances = Array.from(compMap.values())
        .flatMap((c) => c.instances)
        .slice(0, 5);

      for (const inst of sampleInstances) {
        if (resolvedName) break;
        try {
          const bv = inst.boundVariables;
          if (!bv) continue;
          const aliases: VariableAlias[] = [];
          for (const val of Object.values(bv)) {
            if (Array.isArray(val)) {
              for (const v of val) {
                if (v && typeof v === 'object' && 'id' in v) aliases.push(v as VariableAlias);
              }
            } else if (val && typeof val === 'object' && 'id' in (val as Record<string, unknown>)) {
              aliases.push(val as VariableAlias);
            }
          }
          for (const alias of aliases) {
            if (resolvedName) break;
            try {
              const variable = await figma.variables.getVariableByIdAsync(alias.id);
              if (!variable) continue;
              const col = await figma.variables.getVariableCollectionByIdAsync(
                variable.variableCollectionId,
              );
              if (col && col.remote && col.key) {
                const libName = collectionKeyToLibName.get(col.key);
                if (libName) resolvedName = libName;
              }
            } catch {
              // variable resolution can fail
            }
          }
        } catch {
          // boundVariables access can fail
        }
      }
    }

    // Strategy C: Infer from component naming conventions (e.g. "MyDS / Button")
    if (!resolvedName) {
      const compNames = Array.from(compMap.values()).map((c) => c.name);
      resolvedName = inferLibraryNameFromComponents(compNames) ?? undefined;
    }

    // Strategy D: If only one known library exists and one fingerprint group, assume match
    if (!resolvedName && knownLibNames.size === 1 && libGroups.size === 1) {
      resolvedName = knownLibNames.values().next().value as string;
    }

    // Strategy E: Fallback
    if (!resolvedName) {
      externalIdx++;
      resolvedName =
        externalIdx === 1 && libGroups.size === 1
          ? 'External Library'
          : `External Library ${externalIdx}`;
    }

    // ── Build component list with properties ──────────────────────────
    const components: ScannedComponent[] = [];

    for (const [, compData] of compMap) {
      const propsMap = new Map<
        string,
        { type: string; values: Set<string> }
      >();

      for (const inst of compData.instances) {
        try {
          const cpDefs = inst.componentProperties;
          if (cpDefs) {
            for (const [propName, propDef] of Object.entries(cpDefs)) {
              if (!propsMap.has(propName)) {
                propsMap.set(propName, {
                  type: propDef.type,
                  values: new Set(),
                });
              }
              const entry = propsMap.get(propName)!;
              const val = String(propDef.value);
              if (entry.values.size < 50) {
                entry.values.add(val);
              }
            }
          }
        } catch {
          // componentProperties access can throw
        }
      }

      const properties: ScannedComponentProperty[] = [];
      for (const [propName, propData] of propsMap) {
        properties.push({
          name: propName,
          type: propData.type,
          values: Array.from(propData.values).sort(),
        });
      }
      properties.sort((a, b) => a.name.localeCompare(b.name));

      const MAX_STORED_IDS = 20;
      components.push({
        key: compData.key,
        name: compData.name,
        libraryName: resolvedName,
        instanceCount: compData.instances.length,
        instanceNodeIds: compData.instances.slice(0, MAX_STORED_IDS).map((i) => i.id),
        properties,
      });
    }

    components.sort((a, b) => b.instanceCount - a.instanceCount);

    libraries.push({
      id: `lib_${fingerprint}`,
      name: resolvedName,
      components,
      totalInstances: components.reduce((s, c) => s + c.instanceCount, 0),
    });
  }

  libraries.sort((a, b) => b.totalInstances - a.totalInstances);

  return {
    libraries,
    scanInfo: {
      scope,
      totalNodes,
      totalInstances,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    },
  };
}

// ─── Library Loading (Source of Truth) ────────────────────────────────────────
// Scans the CURRENT file for all local variables, components, and styles.
// The user opens their published library file and loads it as the source of truth.

async function loadLibraryFromCurrentFile(): Promise<LoadedLibraryData> {
  const fileName = figma.root.name;
  const loadedCollections: LoadedCollectionInfo[] = [];
  const loadedVariables: LoadedVariableInfo[] = [];
  const loadedComponents: LoadedComponentInfo[] = [];
  const loadedStyles: LoadedStyleInfo[] = [];

  // ── 1. Local variable collections & variables ──────────────────────
  postToUI({
    type: 'PROGRESS_UPDATE',
    payload: { current: 0, total: 4, label: 'Loading variables...' },
  });

  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allVariables = await figma.variables.getLocalVariablesAsync();

    // Index variables by collection id for fast lookup
    const varsByCollection = new Map<string, typeof allVariables>();
    for (const v of allVariables) {
      const list = varsByCollection.get(v.variableCollectionId) ?? [];
      list.push(v);
      varsByCollection.set(v.variableCollectionId, list);
    }

    for (const col of collections) {
      const colVars = varsByCollection.get(col.id) ?? [];
      const modeNames = col.modes.map((m) => m.name);

      loadedCollections.push({
        key: col.key,
        name: col.name,
        variableCount: colVars.length,
        modes: modeNames,
      });

      for (const v of colVars) {
        loadedVariables.push({
          key: v.key,
          name: v.name,
          collectionName: col.name,
          resolvedType: v.resolvedType as 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN',
        });
      }
    }
  } catch {
    // Variables API not available
  }

  // ── 2. Local components (COMPONENT & COMPONENT_SET across all pages) ──
  postToUI({
    type: 'PROGRESS_UPDATE',
    payload: { current: 1, total: 4, label: 'Scanning components...' },
  });

  const pages = figma.root.children;
  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    try {
      await page.loadAsync();
    } catch {
      continue;
    }

    const stack: SceneNode[] = [...page.children];
    while (stack.length > 0) {
      const node = stack.pop()!;

      if (node.type === 'COMPONENT') {
        // Only add top-level components (not variants inside a COMPONENT_SET)
        const isVariant = node.parent?.type === 'COMPONENT_SET';
        if (!isVariant) {
          loadedComponents.push({
            key: node.key,
            name: node.name,
            description: node.description ?? '',
          });
        }
      } else if (node.type === 'COMPONENT_SET') {
        loadedComponents.push({
          key: node.key,
          name: node.name,
          description: node.description ?? '',
        });
      }

      // Recurse into children (skip instances — their internals are controlled)
      if ('children' in node && node.type !== 'INSTANCE') {
        for (let i = (node as FrameNode).children.length - 1; i >= 0; i--) {
          stack.push((node as FrameNode).children[i] as SceneNode);
        }
      }
    }
  }

  // ── 3. Local styles ────────────────────────────────────────────────
  postToUI({
    type: 'PROGRESS_UPDATE',
    payload: { current: 2, total: 4, label: 'Loading styles...' },
  });

  let paintCount = 0;
  let textCount = 0;
  let effectCount = 0;
  let gridCount = 0;

  try {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    for (const s of paintStyles) {
      loadedStyles.push({ id: s.id, name: s.name, styleType: 'PAINT' });
    }
    paintCount = paintStyles.length;
  } catch { /* */ }

  try {
    const textStyles = await figma.getLocalTextStylesAsync();
    for (const s of textStyles) {
      loadedStyles.push({ id: s.id, name: s.name, styleType: 'TEXT' });
    }
    textCount = textStyles.length;
  } catch { /* */ }

  try {
    const effectStyles = await figma.getLocalEffectStylesAsync();
    for (const s of effectStyles) {
      loadedStyles.push({ id: s.id, name: s.name, styleType: 'EFFECT' });
    }
    effectCount = effectStyles.length;
  } catch { /* */ }

  try {
    const gridStyles = await figma.getLocalGridStylesAsync();
    for (const s of gridStyles) {
      loadedStyles.push({ id: s.id, name: s.name, styleType: 'GRID' });
    }
    gridCount = gridStyles.length;
  } catch { /* */ }

  // ── 4. Build summary ──────────────────────────────────────────────
  postToUI({
    type: 'PROGRESS_UPDATE',
    payload: { current: 3, total: 4, label: 'Building summary...' },
  });

  const summary: LoadedLibrarySummary = {
    totalCollections: loadedCollections.length,
    totalVariables: loadedVariables.length,
    colorVariables: loadedVariables.filter((v) => v.resolvedType === 'COLOR').length,
    floatVariables: loadedVariables.filter((v) => v.resolvedType === 'FLOAT').length,
    stringVariables: loadedVariables.filter((v) => v.resolvedType === 'STRING').length,
    booleanVariables: loadedVariables.filter((v) => v.resolvedType === 'BOOLEAN').length,
    totalComponents: loadedComponents.length,
    totalStyles: loadedStyles.length,
    paintStyles: paintCount,
    textStyles: textCount,
    effectStyles: effectCount,
    gridStyles: gridCount,
  };

  return {
    id: fileName,
    name: fileName,
    fileName,
    loadedAt: Date.now(),
    collections: loadedCollections,
    variables: loadedVariables,
    components: loadedComponents,
    styles: loadedStyles,
    summary,
  };
}

async function persistLoadedLibrary(data: LoadedLibraryData | null): Promise<void> {
  try {
    if (data) {
      await figma.clientStorage.setAsync('figxed-loaded-library', data);
    } else {
      await figma.clientStorage.deleteAsync('figxed-loaded-library');
    }
  } catch {
    // clientStorage not available — fallback silent
  }
}

async function restoreLoadedLibrary(): Promise<LoadedLibraryData | null> {
  try {
    const stored = await figma.clientStorage.getAsync('figxed-loaded-library');
    if (stored && typeof stored === 'object' && 'id' in (stored as Record<string, unknown>)) {
      return stored as LoadedLibraryData;
    }
    return null;
  } catch {
    return null;
  }
}

function loadAuditConfig(): AuditConfig | undefined {
  const stored = figma.root.getPluginData('figxed-config');
  if (!stored) return undefined;
  try {
    const config = JSON.parse(stored);
    return config.audit as AuditConfig | undefined;
  } catch {
    return undefined;
  }
}

function loadScanOptions(): ScanOptions | undefined {
  const stored = figma.root.getPluginData('figxed-config');
  if (!stored) return undefined;
  try {
    const config = JSON.parse(stored);
    return config.adoption?.scanOptions as ScanOptions | undefined;
  } catch {
    return undefined;
  }
}

// ─── Event Tracking ─────────────────────────────────────────────────────────

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  postToUI({
    type: 'SELECTION_CHANGED',
    payload: {
      count: selection.length,
      nodeIds: selection.map((n) => n.id),
    },
  });
});

figma.on('currentpagechange', () => {
  // Notify UI of page change so it can reset state if needed
  postToUI({
    type: 'PAGE_CHANGED',
    payload: { pageName: figma.currentPage.name },
  });
  // Also update selection since it changes with page
  postToUI({
    type: 'SELECTION_CHANGED',
    payload: {
      count: figma.currentPage.selection.length,
      nodeIds: getSelectedNodeIds(),
    },
  });
});

// ─── Cleanup on Close ────────────────────────────────────────────────────────

figma.on('close', () => {
  auditEngine = null;
  isScanning = false;
});

// ─── Message Handler ─────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: ToCodeMessage) => {
  try {
    switch (msg.type) {
      case 'UI_READY': {
        // Send file and page info
        postToUI({
          type: 'FILE_INFO',
          payload: {
            fileName: figma.root.name,
            pageName: figma.currentPage.name,
          },
        });
        // Send initial selection state
        postToUI({
          type: 'SELECTION_CHANGED',
          payload: {
            count: figma.currentPage.selection.length,
            nodeIds: getSelectedNodeIds(),
          },
        });
        // Send document-level config (shared data like ignored rules per document)
        const storedConfig = figma.root.getPluginData('figxed-config');
        postToUI({
          type: 'CONFIG_DATA',
          payload: storedConfig ? JSON.parse(storedConfig) : {},
        });
        // Send user-level config (personal preferences stored via clientStorage)
        try {
          const userConfig = await figma.clientStorage.getAsync('figxed-user-config');
          if (userConfig) {
            postToUI({
              type: 'USER_CONFIG_DATA',
              payload: userConfig as Record<string, unknown>,
            });
          }
        } catch {
          // clientStorage not available — ignore
        }

        // Auto-detect libraries
        detectLibraries().then((libs) => {
          postToUI({ type: 'LIBRARIES_DETECTED', payload: libs });
        }).catch(() => {
          // Library detection failed silently
        });

        // Restore loaded library (source of truth) from clientStorage
        restoreLoadedLibrary().then((restoredLib) => {
          if (restoredLib) {
            postToUI({ type: 'LIBRARY_LOADED', payload: restoredLib });
          }
        }).catch(() => {
          // Restore failed silently
        });

        // Dispatch menu/relaunch commands after UI is initialized
        if (command && command !== 'open') {
          handleCommand(command);
        }
        break;
      }

      case 'START_AUDIT': {
        await triggerAudit(msg.payload.scope, msg.payload.pageIds);
        break;
      }

      case 'GET_FILE_PAGES': {
        const pages = figma.root.children.map((p) => ({ id: p.id, name: p.name }));
        postToUI({ type: 'FILE_PAGES_LIST', payload: pages });
        break;
      }

      case 'FIX_ISSUE': {
        if (!auditEngine) {
          notifyUI('Run an audit first', 'error');
          return;
        }
        const fixResult = await auditEngine.fixIssue(msg.payload.issueId);
        postToUI({ type: 'FIX_RESULT', payload: fixResult });
        if (fixResult.success) {
          notifyUI('Issue fixed', 'success');
        } else {
          notifyUI(fixResult.error || 'Fix failed', 'error');
        }
        break;
      }

      case 'FIX_ALL': {
        if (!auditEngine) {
          notifyUI('Run an audit first', 'error');
          return;
        }
        const fixAllResult = await auditEngine.fixAll(msg.payload.category);
        postToUI({ type: 'FIX_ALL_RESULT', payload: fixAllResult });
        const fixMsg = `Fixed ${fixAllResult.fixed}/${fixAllResult.total} issues`;
        notifyUI(fixMsg, fixAllResult.failed > 0 ? 'error' : 'success');
        notifyNative(fixMsg);
        break;
      }

      case 'IGNORE_ISSUE': {
        const { nodeId, ruleId } = msg.payload;
        const node = await figma.getNodeByIdAsync(nodeId);
        if (node && 'setSharedPluginData' in node) {
          const existing = node.getSharedPluginData('figxed', 'ignoredRules');
          const rules = existing ? existing.split(',') : [];
          if (!rules.includes(ruleId)) {
            rules.push(ruleId);
          }
          node.setSharedPluginData('figxed', 'ignoredRules', rules.join(','));
          notifyUI('Issue ignored', 'success');
        }
        break;
      }

      case 'UNIGNORE_ISSUE': {
        const { nodeId, ruleId } = msg.payload;
        const node = await figma.getNodeByIdAsync(nodeId);
        if (node && 'setSharedPluginData' in node) {
          const existing = node.getSharedPluginData('figxed', 'ignoredRules');
          const rules = existing ? existing.split(',').filter((r) => r !== ruleId) : [];
          node.setSharedPluginData('figxed', 'ignoredRules', rules.join(','));
          notifyUI('Issue un-ignored', 'success');
        }
        break;
      }

      case 'SELECT_NODE': {
        const { nodeId } = msg.payload;
        const node = await figma.getNodeByIdAsync(nodeId);
        if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
          // Navigate to the correct page if the node is on a different page
          let pageNode = node.parent;
          while (pageNode && pageNode.type !== 'PAGE') {
            pageNode = pageNode.parent;
          }
          if (pageNode && pageNode !== figma.currentPage) {
            await figma.setCurrentPageAsync(pageNode as PageNode);
          }
          const sceneNode = node as SceneNode;
          figma.currentPage.selection = [sceneNode];
          figma.viewport.scrollAndZoomIntoView([sceneNode]);
        } else {
          notifyUI('Node not found', 'error');
        }
        break;
      }

      case 'START_ADOPTION_SCAN': {
        if (isScanning) {
          notifyUI('A scan is already in progress', 'error');
          return;
        }

        isScanning = true;
        const { scope: scanScope, options: scanOpts } = msg.payload;

        try {
          let scanNodes: SceneNode[] = [];

          switch (scanScope) {
            case 'selection':
              scanNodes = [...figma.currentPage.selection];
              if (scanNodes.length === 0) {
                notifyUI('No elements selected. Select layers to scan.', 'error');
                isScanning = false;
                return;
              }
              break;
            case 'page':
              scanNodes = [...figma.currentPage.children];
              break;
            case 'file': {
              const allPages = figma.root.children;
              for (let i = 0; i < allPages.length; i++) {
                const p = allPages[i];
                postToUI({
                  type: 'PROGRESS_UPDATE',
                  payload: {
                    current: i,
                    total: allPages.length,
                    label: `Loading page "${p.name}" (${i + 1}/${allPages.length})...`,
                  },
                });
                await p.loadAsync();
                scanNodes.push(...p.children);
              }
              break;
            }
          }

          const scanLib = await restoreLoadedLibrary();
          const scanner = new AdoptionScanner(scanOpts, scanLib);
          const adoptionResult = await scanner.scan(scanNodes, scanScope, (current, total) => {
            postToUI({
              type: 'PROGRESS_UPDATE',
              payload: { current, total, label: `Scanning ${scanScope}...` },
            });
          });

          postToUI({ type: 'ADOPTION_RESULTS', payload: adoptionResult });

          const rateStr = `${adoptionResult.metrics.adoptionRate}%`;
          notifyUI(
            `Scan complete. ${adoptionResult.metrics.totalElements} elements analyzed. DS adoption: ${rateStr}`,
            'success'
          );
        } finally {
          isScanning = false;
        }
        break;
      }

      case 'DETECT_LIBRARIES': {
        try {
          const detectedLibs = await detectLibraries();
          postToUI({ type: 'LIBRARIES_DETECTED', payload: detectedLibs });
        } catch {
          postToUI({ type: 'LIBRARIES_DETECTED', payload: [] });
        }
        break;
      }

      case 'SCAN_LIBRARIES': {
        if (isScanning) {
          notifyUI('A scan is already in progress', 'error');
          return;
        }
        isScanning = true;
        try {
          const libScanScope = msg.payload.scope;
          const libPageIds = msg.payload.pageIds;
          if (libScanScope === 'selection' && figma.currentPage.selection.length === 0) {
            notifyUI('No elements selected. Select layers to scan.', 'error');
            isScanning = false;
            return;
          }
          if (libScanScope === 'pages' && (!libPageIds || libPageIds.length === 0)) {
            notifyUI('No pages selected.', 'error');
            isScanning = false;
            return;
          }
          const scanResult = await scanLibraries(libScanScope, libPageIds);
          postToUI({ type: 'LIBRARY_SCAN_RESULTS', payload: scanResult });

          const libCount = scanResult.libraries.length;
          const compCount = scanResult.libraries.reduce((s, l) => s + l.components.length, 0);
          notifyUI(
            `Found ${libCount} ${libCount === 1 ? 'library' : 'libraries'} with ${compCount} components (${scanResult.scanInfo.totalInstances} instances)`,
            'success',
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Library scan failed';
          postToUI({ type: 'ERROR', payload: { message: errMsg } });
        } finally {
          isScanning = false;
        }
        break;
      }

      case 'GET_LIBRARIES': {
        try {
          const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
          const libraries: LibraryInfo[] = collections.map((c) => ({
            key: c.key,
            name: `${c.libraryName} / ${c.name}`,
            componentCount: 0, // Variable count requires loading individual variables
            connected: true,
          }));
          postToUI({ type: 'LIBRARIES_LIST', payload: libraries });
        } catch {
          postToUI({ type: 'LIBRARIES_LIST', payload: [] });
        }
        break;
      }

      case 'CONNECT_LIBRARY': {
        const { libraryKey } = msg.payload;
        const stored = figma.root.getPluginData('figxed-config');
        const cfgObj = stored ? JSON.parse(stored) : {};
        const connected: string[] = cfgObj.adoption?.connectedLibraries ?? [];
        if (!connected.includes(libraryKey)) {
          connected.push(libraryKey);
          setNestedValue(cfgObj, 'adoption.connectedLibraries', connected);
          figma.root.setPluginData('figxed-config', JSON.stringify(cfgObj));
        }
        notifyUI('Library connected', 'success');
        break;
      }

      case 'LOAD_LIBRARY_FROM_FILE': {
        try {
          const libraryData = await loadLibraryFromCurrentFile();
          await persistLoadedLibrary(libraryData);
          postToUI({ type: 'LIBRARY_LOADED', payload: libraryData });

          const parts: string[] = [];
          if (libraryData.summary.totalVariables > 0) parts.push(`${libraryData.summary.totalVariables} variables`);
          if (libraryData.summary.totalComponents > 0) parts.push(`${libraryData.summary.totalComponents} components`);
          if (libraryData.summary.totalStyles > 0) parts.push(`${libraryData.summary.totalStyles} styles`);
          notifyUI(`Library loaded: ${parts.join(', ')}`, 'success');
          notifyNative(`"${libraryData.fileName}" loaded as source of truth`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to load library from file';
          postToUI({ type: 'ERROR', payload: { message: errMsg } });
          notifyUI(errMsg, 'error');
        }
        break;
      }

      case 'UNLOAD_LIBRARY': {
        await persistLoadedLibrary(null);
        postToUI({ type: 'LIBRARY_UNLOADED' });
        notifyNative('Library removed');
        break;
      }

      case 'REFRESH_LOADED_LIBRARY': {
        try {
          const refreshed = await loadLibraryFromCurrentFile();
          await persistLoadedLibrary(refreshed);
          postToUI({ type: 'LIBRARY_LOADED', payload: refreshed });
          notifyUI('Library refreshed from current file', 'success');
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to refresh library';
          postToUI({ type: 'ERROR', payload: { message: errMsg } });
        }
        break;
      }

      case 'EXPORT_DATA': {
        // Export is handled entirely in the UI via Blob URLs
        break;
      }

      case 'GET_CONFIG': {
        const stored = figma.root.getPluginData('figxed-config');
        postToUI({
          type: 'CONFIG_DATA',
          payload: stored ? JSON.parse(stored) : {},
        });
        break;
      }

      case 'UPDATE_CONFIG': {
        const { path, value } = msg.payload;
        const stored = figma.root.getPluginData('figxed-config');
        const config = stored ? JSON.parse(stored) : {};
        setNestedValue(config, path, value);
        figma.root.setPluginData('figxed-config', JSON.stringify(config));
        notifyUI('Settings saved', 'success');
        break;
      }

      case 'SAVE_USER_CONFIG': {
        const { path: userPath, value: userValue } = msg.payload;
        try {
          const existing = (await figma.clientStorage.getAsync('figxed-user-config')) as Record<string, unknown> | undefined;
          const userCfg = existing ?? {};
          setNestedValue(userCfg, userPath, userValue);
          await figma.clientStorage.setAsync('figxed-user-config', userCfg);
          notifyUI('Preferences saved', 'success');
        } catch {
          notifyUI('Failed to save preferences', 'error');
        }
        break;
      }

      case 'RESIZE': {
        const { width, height } = msg.payload;
        const clampedW = Math.max(300, Math.min(800, Math.round(width)));
        const clampedH = Math.max(400, Math.min(1200, Math.round(height)));
        figma.ui.resize(clampedW, clampedH);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    postToUI({ type: 'ERROR', payload: { message } });
  }
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}
