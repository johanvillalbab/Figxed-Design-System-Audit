# FigXed

**Design System Audit & Adoption Analytics for Figma**

FigXed is a Figma plugin that audits your designs against your Design System tokens (variables, styles) and provides adoption metrics. It detects hardcoded values, suggests the closest DS variable, and can auto-fix issues — all without leaving Figma.

---

## Features

### Audit Engine
- **4 built-in rules**: Color, Spacing (padding & gap), and Radius — detects values not bound to a Figma variable
- **Smart matching**: Finds the closest DS variable using perceptual color distance (Delta E CIE76) and numeric proximity
- **Auto-fix**: One-click fix binds the suggested variable to the node property via `setBoundVariable()`
- **Batch processing**: Handles large files (10k+ layers) with async batching and progress reporting
- **Cross-page navigation**: Click any issue to jump to the affected node, even on a different page
- **Library-aware**: Detects variables from team libraries, not just local variables

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

### Polish
- **Error Boundary**: Graceful recovery if the UI crashes
- **Native notifications**: `figma.notify()` for audit results and bulk fixes
- **Menu commands**: "Audit Selection", "Audit Page", "Audit File" accessible from the plugin menu
- **Relaunch button**: Quick "Re-audit" button appears after your first audit
- **Figma theming**: Full dark/light mode support via Figma's semantic CSS tokens

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
    ├── tabs/                  # AuditTab, AdoptionTab, SettingsTab
    ├── components/            # Reusable UI components
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
# Install dependencies
npm install

# Development (watch mode for both UI and sandbox)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck
```

### Loading in Figma

1. Open Figma Desktop
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select the `manifest.json` file from this project
4. The plugin will appear under **Plugins > Development > FigXed**

### Project Structure

| File | Purpose |
|------|---------|
| `manifest.json` | Plugin configuration (permissions, menu, relaunch) |
| `vite.config.ts` | UI build config (React + single-file HTML) |
| `vite.config.code.ts` | Sandbox build config (IIFE bundle) |
| `tsconfig.json` | TypeScript config for UI |
| `tsconfig.code.json` | TypeScript config for sandbox |
| `tailwind.config.js` | Tailwind CSS with Figma theme tokens |

---

## Publishing

Before publishing to the Figma Community:

1. **Get a real plugin ID**: In Figma Desktop, go to Plugins > Development > New Plugin. This generates a numeric ID.
2. **Update `manifest.json`**: Replace `"id": "figxed-plugin"` with your numeric ID.
3. **Update API version**: Consider updating `"api": "1.0.0"` to the latest version.
4. **Prepare listing assets**: Cover image (1920x960), icon, description, and screenshots.

---

## Tech Stack

- **UI**: React 18, TypeScript 5, Tailwind CSS 3, Zustand 4, Recharts 2, Lucide Icons
- **Build**: Vite 5, vite-plugin-singlefile
- **Plugin API**: @figma/plugin-typings
- **Virtualization**: react-window v2

---

## License

MIT
