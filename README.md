# Figxed Design System Audit

**v2.0 — Design System Audit & Adoption Analytics for Figma**

Figxed is a Figma plugin that audits your designs against your Design System tokens (variables, styles) and provides adoption metrics. It detects hardcoded values, suggests the closest DS variable, and can auto-fix issues — all without leaving Figma.

---

## What's New in v2

- **Library Detection** — Auto-detect all external libraries, explore components with instance counts, and locate any instance on the canvas
- **Page Picker** — Select specific pages to scan on large files (200k+ nodes) instead of processing everything
- **Built-in Help Guide** — Step-by-step visual guide accessible from the "Tips" button in the header
- **Re-audit Scope Memory** — Re-auditing preserves your original scope (selection, page, or specific pages)
- **Smoother Animations** — Refined transitions and easing across the entire UI
- **Streamlined Navigation** — Settings accessible from the header icon; main tabs focused on Adoption, Audit, and Libraries

---

## Features

### Audit Engine
- **4 built-in rules**: Color, Spacing (padding & gap), and Radius — detects values not bound to a Figma variable
- **Smart matching**: Finds the closest DS variable using perceptual color distance (Delta E CIE76) and numeric proximity
- **Auto-fix**: One-click fix binds the suggested variable to the node property via `setBoundVariable()`
- **Batch processing**: Handles large files (10k+ layers) with async batching and progress reporting
- **Page picker**: Select specific pages to audit in large files instead of scanning everything
- **Cross-page navigation**: Click any issue to jump to the affected node, even on a different page
- **Library-aware**: Detects variables from team libraries, not just local variables

### Library Detection
- **Auto-detect**: Discovers all external libraries used in your file
- **Component inventory**: Lists every remote component with instance counts and properties
- **Library name resolution**: Resolves library names via team library API and variable tracing
- **Locate on canvas**: Navigate to any component instance directly from the results

### Adoption Scanner
- **Component tracking**: Classifies instances as DS (remote library), local/custom, or detached
- **Token adoption**: Measures how many color, spacing, radius, and text style properties use DS tokens
- **Category breakdown**: Per-category adoption rates (Components, Colors, Spacing, Text Styles, Radius)
- **Top components**: Ranks the most-used DS components

### Export & Reports
- **JSON**: Full structured audit data for CI integration
- **CSV**: Spreadsheet-friendly issue list
- **Markdown**: Executive report with health score, summary, and top issues
- **Clipboard**: Copy the Markdown report for quick sharing

### Settings
- Toggle audit rules on/off
- Adjust matching thresholds (spacing tolerance, color Delta E, radius tolerance)
- Override severity per rule (error / warning / info)
- Scan options (ignore hidden layers, group detached, include text styles)
- Preferences saved per-user via `clientStorage`, shared config via `pluginData`

### Help Guide
- Built-in step-by-step visual guide covering every feature
- Sections: Start, Adoption, Audit, Libraries, and Pro-tips
- Accessible from the "Tips" button in the header

---

## Architecture

```
src/
├── code.ts                    # Plugin sandbox (Figma API)
├── analyzer/
│   └── adoptionScanner.ts     # Adoption metrics engine
├── audit/
│   ├── engine.ts              # Audit orchestrator (batch, progress, fix)
│   ├── rules/                 # BaseRule + 4 rule implementations
│   └── matchers/              # Color (Delta E), Spacing, Radius matchers
├── types/                     # Shared TypeScript types
└── ui/
    ├── App.tsx                # Root component with ErrorBoundary
    ├── tabs/                  # AuditTab, AdoptionTab, LibrariesTab, SettingsTab
    ├── components/            # HelpGuide, PagePicker, QuickActions, etc.
    ├── hooks/                 # Zustand store + message handling
    ├── utils/                 # Exporters (JSON, CSV, Markdown)
    └── styles/                # Tailwind + Figma theme tokens
```

**Communication**: The plugin sandbox (`code.ts`) and the UI iframe communicate via typed message passing (`ToCodeMessage` / `ToUIMessage`). State management in the UI uses Zustand.

**Build**: Two separate Vite builds — the UI compiles to a single HTML file (inlined CSS/JS via `vite-plugin-singlefile`), and the sandbox compiles to an IIFE bundle.

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- Figma Desktop App (for testing)

### Setup

```bash
npm install
npm run dev    # Watch mode
npm run build  # Production build
npm run typecheck
```

### Loading in Figma

1. Open Figma Desktop
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select the `manifest.json` file from this project
4. The plugin will appear under **Plugins > Development > Figxed Design System Audit**

---

## Tech Stack

- **UI**: React 18, TypeScript 5, Tailwind CSS 3, Zustand 4, Framer Motion, Lucide Icons
- **Build**: Vite 5, vite-plugin-singlefile
- **Plugin API**: @figma/plugin-typings

---

## License

MIT
