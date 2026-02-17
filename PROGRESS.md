# FigXed Plugin - Registro de Avance

## Estado General

| Fase | Estado | Descripcion |
|------|--------|-------------|
| Fase 1: Setup & Fundamentos | COMPLETADA | Estructura, build, tipos, tabs, comunicacion |
| Fase 2: Motor de Audit | COMPLETADA | Engine, 4 reglas, matchers, auto-fix |
| Fase 2.5: Hardening & Bug Fixes | COMPLETADA | Variables libreria, hidden layers, health score, cross-page, tokens |
| Fase 3: UI de Audit Tab | COMPLETADA | Virtualizado, IssueCard, stats, animaciones, fix/ignore tracking |
| Fase 4: Analyzer - Conexion Library | COMPLETADA | AdoptionScanner, permiso teamlibrary, GET_LIBRARIES, CONNECT_LIBRARY |
| Fase 5: UI de Adoption Tab | COMPLETADA | Recharts donut, scope selector, breakdown categorias, tabla componentes |
| Fase 6: Export & Reports | COMPLETADA | JSON, CSV, Markdown export, clipboard copy, download via Blob URL |
| Fase 7: Settings & Configuration | COMPLETADA | clientStorage para prefs usuario, severity overrides, feedback visual |
| Fase 8: Polish & Performance | COMPLETADA | ErrorBoundary, figma.notify, figma.on close, menu, relaunch, command |
| Fase 9: Documentation & Launch | COMPLETADA | README.md, arquitectura, instrucciones build (ID real pendiente manual) |

---

## Fase 1: Setup & Fundamentos - COMPLETADA

### Lo que se hizo
- Proyecto inicializado con Vite + React 18 + TypeScript 5
- Dos configs de build: `vite.config.ts` (UI -> single HTML) y `vite.config.code.ts` (sandbox -> IIFE)
- Tailwind CSS con tokens de Figma (variables CSS que mapean al theme de Figma)
- `manifest.json` configurado con permisos correctos
- Tipos TypeScript definidos para audit, adoption, mensajes y config
- Comunicacion bidireccional type-safe entre plugin sandbox (`code.ts`) y UI (React)
- Shell de React con 3 tabs (Audit, Adoption, Settings)
- Zustand store con estado de navegacion, audit, adoption, filtros, progreso
- Componentes base: Header, TabBar, ProgressBar, Notification, HealthScore, QuickActions, EmptyState

### Archivos creados
```
manifest.json, package.json, tsconfig.json, tsconfig.code.json
vite.config.ts, vite.config.code.ts
tailwind.config.js, postcss.config.js, .gitignore
src/code.ts
src/types/{common,audit,adoption,messages,index}.ts
src/ui/{index.html,index.tsx,App.tsx}
src/ui/styles/globals.css
src/ui/hooks/{useStore,usePluginMessages}.ts
src/ui/components/{Header,TabBar,ProgressBar,Notification,HealthScore,QuickActions,EmptyState}.tsx
src/ui/tabs/{AuditTab,AdoptionTab,SettingsTab}.tsx
```

---

## Fase 2: Motor de Audit - COMPLETADA

### Lo que se hizo
- **AuditEngine** (`src/audit/engine.ts`): Orquestador principal
  - Traversal recursivo de todos los nodos
  - Procesamiento en batches de 500 nodos (yield al main thread entre batches)
  - Progress reporting via callback
  - Generacion de summary y stats
  - Almacenamiento de issues para operaciones de fix
  - `fixIssue()` y `fixAll()` con soporte por categoria

- **BaseRule** (`src/audit/rules/BaseRule.ts`): Clase abstracta base
  - `createIssue()` helper con generacion de ID y node path
  - `getNodePath()` para breadcrumb de ubicacion del nodo

- **4 Reglas implementadas:**
  1. **PaddingWithoutVariableRule** - Detecta paddingTop/Right/Bottom/Left sin variable en frames con Auto Layout
  2. **GapWithoutVariableRule** - Detecta itemSpacing y counterAxisSpacing sin variable
  3. **ColorWithoutVariableRule** - Detecta fills y strokes sin variable (acepta color styles legacy como valido)
  4. **RadiusWithoutVariableRule** - Detecta cornerRadius uniforme y mixto sin variable

- **3 Matchers implementados:**
  1. **SpacingMatcher** - Busca variable de spacing mas cercana por proximidad en pixeles (threshold: 4px)
  2. **ColorMatcher** - Busca variable de color mas cercana por Delta E CIE76 (threshold: 10)
  3. **RadiusMatcher** - Busca variable de radius mas cercana por proximidad en pixeles (threshold: 2px)

- **Auto-fix**: Cada regla tiene `autoFix()` que aplica `setBoundVariable()` o `setBoundVariableForPaint()`

- **code.ts actualizado**: START_AUDIT crea AuditEngine, ejecuta audit con progress, envia resultados. FIX_ISSUE y FIX_ALL delegan al engine.

### Archivos creados
```
src/audit/types.ts
src/audit/engine.ts
src/audit/rules/{BaseRule,PaddingRule,GapRule,ColorRule,RadiusRule}.ts
src/audit/matchers/{utils,spacingMatcher,colorMatcher,radiusMatcher}.ts
```

### Detalles tecnicos
- Matchers usan cache que se limpia en cada nuevo audit
- Color matching usa conversion RGB -> Lab (sRGB -> XYZ -> Lab) para comparacion perceptual
- Resolucion de variable aliases (variables que apuntan a otras variables)
- Respeta layers locked y nodos marcados como ignored via `sharedPluginData`
- Build output: UI 186 KB, code.js 30.7 KB, 0 errores TypeScript

---

## Fase 2.5: Hardening & Bug Fixes - COMPLETADA

Basada en auditoria contra la documentacion oficial de Figma Plugin API. Corrige bugs criticos y alinea con mejores practicas.

### Lo que se hizo

1. **Matchers: Variables de libreria** (2.5.1)
   - Helper `getAllAvailableVariables(type)` en `utils.ts` que combina variables locales + importadas de librerias
   - Los 3 matchers (color, spacing, radius) ahora detectan variables de librerias del equipo, no solo locales
   - Elimina falsos positivos cuando el Design System usa variables de libreria

2. **Engine: Ignorar hidden layers** (2.5.2)
   - `AuditEngine` acepta `ScanOptions` en el constructor
   - `processBatch()` respeta `ignoreHiddenLayers` chequeando `node.visible`
   - `code.ts` carga y pasa `ScanOptions` al engine

3. **Health score basado en nodos unicos** (2.5.3)
   - Nuevo campo `nodesWithIssues` en `AuditStats` cuenta nodos unicos con issues (`Set<nodeId>.size`)
   - Health score en `AuditTab.tsx` usa `nodesWithIssues` en vez de `totalIssues`
   - Score ya no puede ser artificialmente bajo por nodos con multiples issues

4. **SELECT_NODE cross-page** (2.5.4)
   - `SELECT_NODE` navega automaticamente a la pagina correcta via `figma.setCurrentPageAsync()`
   - Traversa el arbol de nodos hacia arriba para encontrar la PageNode padre
   - Ya no falla silenciosamente cuando el nodo esta en otra pagina

5. **Listener de currentpagechange** (2.5.5)
   - Nuevo listener `figma.on('currentpagechange')` en `code.ts`
   - Envia `PAGE_CHANGED` y `SELECTION_CHANGED` a la UI al cambiar de pagina
   - Nuevo tipo `PAGE_CHANGED` en `ToUIMessage` en `messages.ts`

6. **File scan progresivo** (2.5.6)
   - Scan de archivo completo muestra progress por pagina ("Loading page X (1/N)...")
   - Cada pagina se carga secuencialmente con `loadAsync()` y progress updates

7. **Limpiar timeouts en usePluginMessages** (2.5.7)
   - `useRef` para trackear timer IDs de notificaciones
   - `clearTimeout()` al recibir nueva notificacion (evita stacking)
   - Timer se limpia en cleanup del `useEffect` (evita memory leaks al desmontar)

8. **Tokens semanticos de Figma** (2.5.8)
   - Reemplazados colores Tailwind hardcodeados (`bg-red-100 text-red-700`) por clases CSS theme-aware
   - Nuevas clases `.chip-color`, `.chip-spacing`, `.chip-geometry`, etc. usando `color-mix()` con tokens Figma
   - Badges y filter chips se adaptan correctamente a dark mode de Figma
   - `categoryMeta` y `severityMeta` en `AuditTab.tsx` usan `chipClass` en vez de `color`

9. **CSS fallbacks scoped** (2.5.9)
   - Fallbacks de variables CSS movidos de `:root` a `body:not(.figma-light):not(.figma-dark)`
   - Cuando Figma inyecta sus tokens (`themeColors: true`), los fallbacks no interfieren
   - Agregados tokens adicionales: `--figma-color-text-danger`, `--figma-color-text-brand`, `--figma-color-bg-component`, etc.

10. **IDs de issues deterministicos** (2.5.10)
    - Issue IDs cambiados de `${ruleId}-${counter}` a `${ruleId}::${nodeId}::${property}`
    - IDs estables entre re-audits (mismo nodo + propiedad = mismo ID)
    - Eliminados `issueCounter` global y `resetIssueCounter()` — no mas estado mutable compartido

### Archivos modificados
```
MODIFICADO: src/audit/matchers/utils.ts (getAllAvailableVariables helper)
MODIFICADO: src/audit/matchers/colorMatcher.ts (usa getAllAvailableVariables)
MODIFICADO: src/audit/matchers/spacingMatcher.ts (usa getAllAvailableVariables)
MODIFICADO: src/audit/matchers/radiusMatcher.ts (usa getAllAvailableVariables)
MODIFICADO: src/audit/engine.ts (ScanOptions, ignoreHiddenLayers, nodesWithIssues)
MODIFICADO: src/audit/rules/BaseRule.ts (IDs deterministicos, eliminado counter)
MODIFICADO: src/types/audit.ts (nodesWithIssues en AuditStats)
MODIFICADO: src/types/messages.ts (PAGE_CHANGED en ToUIMessage)
MODIFICADO: src/code.ts (cross-page SELECT_NODE, currentpagechange, file scan progress, ScanOptions)
MODIFICADO: src/ui/hooks/usePluginMessages.ts (useRef timers, PAGE_CHANGED handler)
MODIFICADO: src/ui/tabs/AuditTab.tsx (chipClass, nodesWithIssues health score)
MODIFICADO: src/ui/styles/globals.css (scoped fallbacks, theme-aware chips/badges)
```

---

## Fase 3: UI de Audit Tab - COMPLETADA

### Lo que se hizo
- **react-window v2** (`List` component) para virtualizar la lista de issues
  - Soporta variable row height via `rowHeight` function
  - `rowComponent` pattern con `IssueRow` + `IssueRowProps`
  - Auto-resize al container via ResizeObserver interno
  - `overscanCount: 5` para scroll suave

- **IssueCard** (`src/ui/components/IssueCard.tsx`): Componente extraido y mejorado
  - `React.memo` para evitar re-renders innecesarios
  - Category badge con icono y color por categoría
  - Node path clickeable (navega al nodo en Figma)
  - Sugerencia de variable con formato monospace y flecha
  - Botones con iconos: Fix (Wand2), Ignore (EyeOff), Select (MousePointerClick)
  - CSS classes dedicadas: `issue-btn-fix`, `issue-btn-secondary`, `issue-category-badge`
  - Colores theme-aware via CSS custom properties de Figma

- **Fix/Ignore tracking en el store**:
  - `fixedIssueIds[]` y `ignoredIssueIds[]` en Zustand
  - Se limpian al hacer nuevo audit
  - `FIX_RESULT` exitoso agrega al set de fixed
  - Ignore es optimistic (se agrega inmediatamente al click)
  - `showFixed` toggle para mostrar/ocultar resueltos
  - `getFilteredIssues()` filtra fixed+ignored por defecto

- **Stats bar**: Duración del audit, nodes procesados, total issues, resolved count

- **Animación**: `issue-slide-in` keyframe (fade + translateY) en cada card

- **Filter chips mejorados**: Usan `data-active` para toggle visual con CSS

- **Re-Audit inteligente**: Recuerda `lastAuditScope` y lo usa para re-audit

### Lo que queda (no-MVP, Fase 8)
- Vista de layers jerárquica (tree view)
- Keyboard shortcuts para navegar issues

### Archivos creados/modificados
```
NUEVO: src/ui/components/IssueCard.tsx
MODIFICADO: src/ui/tabs/AuditTab.tsx (reescrito con react-window v2)
MODIFICADO: src/ui/components/QuickActions.tsx (trackea lastAuditScope)
MODIFICADO: src/ui/hooks/useStore.ts (fixedIssueIds, ignoredIssueIds, showFixed, lastAuditScope)
MODIFICADO: src/ui/hooks/usePluginMessages.ts (addFixedIssue en FIX_RESULT)
MODIFICADO: src/ui/styles/globals.css (issue card styles, animations, filter chips)
MODIFICADO: src/ui/App.tsx (min-h-0 para flex layout)
```

---

## Fase 4: Analyzer - Conexion Library - COMPLETADA

### Lo que se hizo
- **Permiso `teamlibrary`** agregado a `manifest.json`
- **`AdoptionScanner`** (`src/analyzer/adoptionScanner.ts`): Motor de escaneo completo
  - Misma arquitectura batch del AuditEngine (500 nodos/batch, async yield)
  - Clasifica instances: DS (remote) vs Custom (local) vs Detached (sin mainComponent)
  - Tracking de colores tokenizados (fills/strokes con variables o styles)
  - Tracking de spacing tokenizado (padding, gap con boundVariables)
  - Tracking de radius tokenizado
  - Tracking de text styles (textStyleId)
  - Genera `AdoptionResult` con metricas, componentes top, categorias, scanInfo
- **`GET_LIBRARIES`** conectado a `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()`
- **`CONNECT_LIBRARY`** guarda librerias conectadas en pluginData
- **`START_ADOPTION_SCAN`** actualizado con scope (selection/page/file) y progress reporting
- **`messages.ts`** actualizado con scope en el payload de adoption scan

### Archivos creados/modificados
```
NUEVO: src/analyzer/adoptionScanner.ts
MODIFICADO: manifest.json (permiso teamlibrary)
MODIFICADO: src/code.ts (handlers adoption)
MODIFICADO: src/types/messages.ts (scope en START_ADOPTION_SCAN)
```

---

## Fase 5: UI de Adoption Tab - COMPLETADA

### Lo que se hizo
- **Donut chart con Recharts**: `PieChart` + `Pie` + `Cell` con tooltip interactivo
- **Scope selector**: Botones Scan Selection / Page / File (como QuickActions del AuditTab)
- **Stats bar**: Duracion, nodos escaneados, tipo de scope
- **Breakdown por categoria**: Barras de progreso con colores semanticos por tipo
- **Tabla de top componentes**: Top 10 con nombre, trend icon, count
- **Legend del donut**: DS, Detached, Custom con colores
- **lastScanScope** en Zustand store para recordar ultimo scope
- **Footer**: Export CSV funcional + Re-scan

### Archivos modificados
```
MODIFICADO: src/ui/tabs/AdoptionTab.tsx (reescrito completo con Recharts)
MODIFICADO: src/ui/hooks/useStore.ts (lastScanScope)
```

---

## Fase 6: Export & Reports - COMPLETADA

### Lo que se hizo
- **`src/ui/utils/exporters.ts`**: Funciones puras de exportacion
  - `exportAuditJSON()` — JSON formateado con issues, stats, summary
  - `exportAuditCSV()` — CSV con 11 columnas
  - `exportAuditMarkdown()` — Reporte ejecutivo con health score, tablas, top issues
  - `exportAdoptionJSON()` — JSON con metricas, categorias, componentes
  - `exportAdoptionCSV()` — CSV multi-seccion (metricas + categorias + componentes)
  - `downloadFile()` — Crea Blob URL y dispara descarga via `<a>` click
  - `copyToClipboard()` — Con fallback para contextos restringidos
- **Export menu en AuditTab**: Dropdown con opciones JSON, CSV, Markdown, Copy to clipboard
- **Export CSV en AdoptionTab**: Boton conectado a funcion real
- **Estilo `.export-menu-item`** en globals.css

### Archivos creados/modificados
```
NUEVO: src/ui/utils/exporters.ts
MODIFICADO: src/ui/tabs/AuditTab.tsx (ExportMenu component)
MODIFICADO: src/ui/tabs/AdoptionTab.tsx (export CSV funcional)
MODIFICADO: src/ui/styles/globals.css (export-menu-item)
```

---

## Fase 7: Settings & Configuration - COMPLETADA

### Lo que se hizo (completando lo parcial)
- **clientStorage migration**: Preferencias personales (thresholds, reglas, scan options) se guardan por usuario
  - `SAVE_USER_CONFIG` handler en code.ts usa `figma.clientStorage.setAsync()`
  - `UI_READY` carga ambas fuentes: pluginData (documento) + clientStorage (usuario)
  - `USER_CONFIG_DATA` mensaje nuevo para enviar config de usuario a la UI
  - `usePluginMessages.ts` maneja el merge de ambas configuraciones
- **Severity overrides**: Dropdown por regla (error/warning/info) en SettingsTab
  - Se persisten en clientStorage como `audit.severityOverrides`
- **Feedback visual al guardar**: Indicador "Saved" con check icon y animacion fade-in
- **Reset mejorado**: Resetea ambas fuentes (pluginData + clientStorage)

### Archivos modificados
```
MODIFICADO: src/types/messages.ts (SAVE_USER_CONFIG, USER_CONFIG_DATA)
MODIFICADO: src/code.ts (SAVE_USER_CONFIG handler, UI_READY con clientStorage)
MODIFICADO: src/ui/tabs/SettingsTab.tsx (severity overrides, save flash)
MODIFICADO: src/ui/hooks/usePluginMessages.ts (USER_CONFIG_DATA handler)
MODIFICADO: src/ui/styles/globals.css (animate-fade-in)
```

---

## Fase 8: Polish & Performance - COMPLETADA

### Lo que se hizo
- **ErrorBoundary** (`src/ui/components/ErrorBoundary.tsx`): Class component con fallback graceful y boton "Reload Plugin"
- **App.tsx** envuelto con `<ErrorBoundary>`
- **`figma.notify()` nativo**: Se usa para audit completado, fix all, y errores criticos
- **`figma.on('close')`**: Limpia auditEngine y isScanning al cerrar el plugin
- **Manifest `menu`**: Subcomandos — Open Panel, Audit Selection, Audit Page, Audit File
- **`relaunchButtons`**: Boton "Re-audit" configurado en manifest
- **`setRelaunchData()`**: Se ejecuta despues de cada audit exitoso
- **`figma.command`**: Handler completo que despacha audits desde el menu y relaunch
- **`triggerAudit()`**: Funcion centralizada usada tanto por el message handler como por commands
- **`handleCommand()`**: Despacha menu commands al `triggerAudit` correcto

### Archivos creados/modificados
```
NUEVO: src/ui/components/ErrorBoundary.tsx
MODIFICADO: src/ui/App.tsx (envuelto con ErrorBoundary)
MODIFICADO: manifest.json (menu, relaunchButtons)
MODIFICADO: src/code.ts (notifyNative, handleCommand, triggerAudit, figma.on close)
```

### Lo que queda (post-MVP, futuro)
- ESLint Figma plugin (`@figma/eslint-plugin-figma-plugins`)
- Loading skeletons
- Tooltips detallados
- Keyboard shortcuts
- Vista de layers jerarquica (tree view)
- Testing con archivos grandes (10k+ layers)
- Performance benchmarks

---

## Fase 9: Documentation & Launch - COMPLETADA

### Lo que se hizo
- **README.md** completo: Features, arquitectura, setup de desarrollo, instrucciones de build, tech stack
- **API version** verificada: `1.0.0` es la version actual en los typings

### Lo que queda (accion manual)
- **Obtener ID real de Figma**: Reemplazar `"id": "figxed-plugin"` por ID numerico generado via Figma Desktop -> Plugins -> Development -> New Plugin
- Plugin listing assets (screenshots, cover, descripcion)
- Demo video
- User guide

---

## Estructura Actual del Proyecto

```
figxed-plugin/
├── manifest.json
├── package.json
├── tsconfig.json
├── tsconfig.code.json
├── vite.config.ts
├── vite.config.code.ts
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── README.md
├── PROGRESS.md                      <-- Este archivo
├── src/
│   ├── code.ts                      # Plugin sandbox
│   ├── analyzer/
│   │   └── adoptionScanner.ts       # AdoptionScanner
│   ├── types/
│   │   ├── index.ts
│   │   ├── common.ts
│   │   ├── audit.ts
│   │   ├── adoption.ts
│   │   └── messages.ts
│   ├── audit/
│   │   ├── engine.ts                # AuditEngine
│   │   ├── types.ts
│   │   ├── rules/
│   │   │   ├── BaseRule.ts
│   │   │   ├── PaddingRule.ts
│   │   │   ├── GapRule.ts
│   │   │   ├── ColorRule.ts
│   │   │   └── RadiusRule.ts
│   │   └── matchers/
│   │       ├── utils.ts             # RGB->Lab, deltaE, getAllAvailableVariables
│   │       ├── spacingMatcher.ts
│   │       ├── colorMatcher.ts
│   │       └── radiusMatcher.ts
│   ├── ui/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── hooks/
│   │   │   ├── useStore.ts
│   │   │   └── usePluginMessages.ts
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Notification.tsx
│   │   │   ├── HealthScore.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── IssueCard.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── tabs/
│   │   │   ├── AuditTab.tsx
│   │   │   ├── AdoptionTab.tsx
│   │   │   └── SettingsTab.tsx
│   │   └── utils/
│   │       └── exporters.ts         # JSON, CSV, Markdown exporters
│   └── utils/                        # (vacio)
└── dist/
    ├── code.js                       # 47.9 KB (IIFE)
    └── src/ui/index.html             # 577 KB (single file)
```

---

## Hotfixes aplicados (pre-Fase 3)

### HealthScore — Cálculo podía dar valores negativos
- Un nodo puede tener múltiples issues (padding + color + radius), causando que `totalIssues > processedNodes`
- Fix: `Math.max(0, Math.min(100, ...))` para clampar el score entre 0-100
- **Mejorado en Fase 2.5**: Ahora usa `nodesWithIssues` (nodos unicos) en vez de `totalIssues`

### Notification — Colores hardcodeados
- Reemplazados colores Tailwind hardcodeados (`bg-blue-50`, etc.) por clases CSS basadas en tokens Figma
- Nuevas clases en globals.css: `notification-info`, `notification-success`, `notification-error`
- Usan `color-mix()` con las CSS variables de Figma para respetar el tema

### HealthScore UI — Colores hardcodeados
- Misma mejora: reemplazados `text-green-600`/`bg-green-50` por clases CSS theme-aware
- Nuevas clases: `score-excellent`, `score-good`, `score-needs-work`, `score-critical`
- Los colores se adaptan al tema de Figma (light/dark)

---

## Build Info

- **UI Build**: Vite + React + vite-plugin-singlefile -> `dist/src/ui/index.html` (577 KB)
- **Code Build**: Vite lib mode IIFE -> `dist/code.js` (47.9 KB)
- **TypeScript**: 0 errores en ambos tsconfigs
- **Comando**: `npm run build` ejecuta ambos builds secuencialmente

## Dependencias

### Produccion
- react 18, react-dom 18, zustand 4, recharts 2, lucide-react, react-window 2

### Desarrollo
- @figma/plugin-typings, typescript 5, vite 5, @vitejs/plugin-react
- tailwindcss 3, postcss, autoprefixer
- vite-plugin-singlefile, concurrently
