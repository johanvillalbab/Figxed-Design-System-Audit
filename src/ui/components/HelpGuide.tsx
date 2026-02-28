import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BarChart3,
  ClipboardCheck,
  Library,
  Search,
  FileText,
  Files,
  Zap,
  MousePointerClick,
  Download,
  ChevronRight,
  Sparkles,
  Eye,
  Target,
  Layers,
  Palette,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../hooks/useStore';

const smooth = [0.32, 0.72, 0, 1] as [number, number, number, number];

interface StepProps {
  number?: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  tips?: string[];
  accent: string;
  delay: number;
}

function Step({ number, icon, title, description, tips, accent, delay }: StepProps) {
  return (
    <motion.div
      className="relative flex gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: smooth }}
    >
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: accent }}
        >
          {icon}
        </div>
        <div className="w-px flex-1 mt-1.5 mb-0" style={{ backgroundColor: 'var(--figma-color-border)' }} />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {number != null && (
            <span
              className="text-2xs font-bold px-1.5 py-0.5 rounded-md tabular-nums"
              style={{
                backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--figma-color-bg))`,
                color: accent,
              }}
            >
              {number}
            </span>
          )}
          <h4 className="text-xs font-semibold text-figma-text">{title}</h4>
        </div>
        <p className="text-2xs text-figma-text-secondary leading-relaxed">{description}</p>
        {tips && tips.length > 0 && (
          <div className="mt-2 space-y-1">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <ChevronRight size={10} className="shrink-0 mt-0.5 text-figma-text-tertiary" />
                <span className="text-2xs text-figma-text-tertiary leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  delay: number;
}

function SectionHeader({ icon, title, subtitle, delay }: SectionHeaderProps) {
  return (
    <motion.div
      className="flex items-center gap-2.5 mb-3 mt-1"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: smooth }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--figma-color-bg-secondary)' }}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-xs font-bold text-figma-text">{title}</h3>
        <p className="text-2xs text-figma-text-tertiary">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function FeatureChip({ icon, label, delay }: { icon: React.ReactNode; label: string; delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-medium text-figma-text-secondary"
      style={{ backgroundColor: 'var(--figma-color-bg-secondary)' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: smooth }}
    >
      {icon}
      {label}
    </motion.div>
  );
}

const SECTIONS = ['overview', 'adoption', 'audit', 'libraries', 'tips'] as const;
type Section = typeof SECTIONS[number];

const SECTION_META: Record<Section, { label: string; icon: React.ReactNode }> = {
  overview: { label: 'Start', icon: <Sparkles size={11} /> },
  adoption: { label: 'Adoption', icon: <BarChart3 size={11} /> },
  audit: { label: 'Audit', icon: <ClipboardCheck size={11} /> },
  libraries: { label: 'Libraries', icon: <Library size={11} /> },
  tips: { label: 'Pro-tips', icon: <Zap size={11} /> },
};

export function HelpGuide() {
  const { showHelp, setShowHelp } = useStore();
  const [activeSection, setActiveSection] = useState<Section>('overview');

  return (
    <AnimatePresence>
      {showHelp && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-figma-bg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.35, ease: smooth }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-figma-border">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--figma-color-bg-brand)' }}
              >
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-figma-text">How to Use Figxed</h2>
                <p className="text-2xs text-figma-text-tertiary">Step-by-step guide</p>
              </div>
            </div>
            <button
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-figma-bg-hover text-figma-text-tertiary transition-colors cursor-pointer"
              onClick={() => setShowHelp(false)}
            >
              <X size={14} />
            </button>
          </div>

          {/* Section nav */}
          <div className="shrink-0 flex gap-0.5 px-2 py-1.5 border-b border-figma-border overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-2xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                style={{
                  backgroundColor: activeSection === s ? 'var(--figma-color-bg-brand)' : 'transparent',
                  color: activeSection === s ? '#fff' : 'var(--figma-color-text-secondary)',
                }}
                onClick={() => setActiveSection(s)}
              >
                {SECTION_META[s].icon}
                {SECTION_META[s].label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                className="p-3.5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: smooth }}
              >
                {activeSection === 'overview' && <OverviewSection />}
                {activeSection === 'adoption' && <AdoptionSection />}
                {activeSection === 'audit' && <AuditSection />}
                {activeSection === 'libraries' && <LibrariesSection />}
                {activeSection === 'tips' && <TipsSection />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-figma-border bg-figma-bg px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-2xs text-figma-text-tertiary">
                Figxed Design System Audit
              </p>
              <button
                className="flex items-center gap-1 text-2xs font-medium text-figma-brand hover:underline cursor-pointer"
                onClick={() => window.open('https://github.com/johanvillalbab/Figxed-Design-System-Audit', '_blank')}
              >
                GitHub <ExternalLink size={10} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OverviewSection() {
  const brandColor = 'var(--figma-color-bg-brand)';
  return (
    <div>
      {/* Hero */}
      <motion.div
        className="text-center mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: smooth }}
      >
        <motion.div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: brandColor }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: smooth }}
        >
          <Check size={22} className="text-white" strokeWidth={3} />
        </motion.div>
        <h3 className="text-sm font-bold text-figma-text mb-1">Welcome to Figxed</h3>
        <p className="text-2xs text-figma-text-secondary leading-relaxed max-w-[260px] mx-auto">
          Audit your Figma designs against your Design System. Detect hardcoded values, measure token adoption, and explore libraries.
        </p>
      </motion.div>

      {/* What you can do */}
      <motion.p
        className="section-label mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        What you can do
      </motion.p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <FeatureChip icon={<BarChart3 size={12} />} label="Adoption Metrics" delay={0.25} />
        <FeatureChip icon={<ClipboardCheck size={12} />} label="Token Audit" delay={0.3} />
        <FeatureChip icon={<Library size={12} />} label="Library Detection" delay={0.35} />
        <FeatureChip icon={<Download size={12} />} label="Export Reports" delay={0.4} />
        <FeatureChip icon={<Zap size={12} />} label="Auto-fix Issues" delay={0.45} />
        <FeatureChip icon={<MousePointerClick size={12} />} label="Locate on Canvas" delay={0.5} />
      </div>

      {/* Quick start */}
      <motion.p
        className="section-label mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        Quick Start
      </motion.p>
      <Step
        icon={<Layers size={13} />}
        title="Open your design file"
        description="Run the plugin from Plugins > Figxed Design System Audit on any Figma file that uses a Design System."
        accent={brandColor}
        delay={0.45}
      />
      <Step
        icon={<BarChart3 size={13} />}
        title="Check Adoption"
        description="The Adoption tab gives you an instant overview of how well your file follows the Design System — components, colors, spacing, and more."
        accent={brandColor}
        delay={0.5}
      />
      <Step
        icon={<ClipboardCheck size={13} />}
        title="Run an Audit"
        description="Switch to the Audit tab and scan your selection, page, or specific pages to find hardcoded values that should be using DS tokens."
        accent={brandColor}
        delay={0.55}
      />
      <Step
        icon={<Zap size={13} />}
        title="Fix issues"
        description="Each issue shows a suggested token. Click Fix to auto-bind the variable, or navigate to the node to review it first."
        accent={brandColor}
        delay={0.6}
      />
    </div>
  );
}

function AdoptionSection() {
  const accent = '#10b981';
  return (
    <div>
      <SectionHeader
        icon={<BarChart3 size={16} className="text-figma-icon-secondary" />}
        title="Adoption Tab"
        subtitle="Measure how well your file follows the Design System"
        delay={0}
      />

      <Step
        icon={<Search size={13} />}
        title="Choose a scan scope"
        description="Select what to scan: your current selection, the active page, or choose specific pages for large files."
        tips={[
          'Selection scope only scans nodes you have selected',
          'Page scope scans all visible nodes on the current page',
          'File scope lets you pick which pages to include',
        ]}
        accent={accent}
        delay={0.05}
      />
      <Step
        icon={<BarChart3 size={13} />}
        title="Review your score"
        description="An overall adoption score shows the percentage of properties that use DS tokens. Higher is better."
        accent={accent}
        delay={0.1}
      />
      <Step
        icon={<Layers size={13} />}
        title="Explore categories"
        description="See per-category breakdowns: Components, Colors, Spacing, Text Styles, and Radius. Each shows how many values are tokenized vs hardcoded."
        tips={[
          'Components: classifies instances as DS, local, or detached',
          'Colors: checks if fill and stroke colors use variables',
          'Spacing: checks padding and gap bindings',
        ]}
        accent={accent}
        delay={0.15}
      />
      <Step
        icon={<Target size={13} />}
        title="See top components"
        description="The most-used DS components are ranked by instance count, so you can see which parts of the library are most adopted."
        accent={accent}
        delay={0.2}
      />
    </div>
  );
}

function AuditSection() {
  const accent = '#6366f1';
  return (
    <div>
      <SectionHeader
        icon={<ClipboardCheck size={16} className="text-figma-icon-secondary" />}
        title="Audit Tab"
        subtitle="Find and fix hardcoded values in your designs"
        delay={0}
      />

      <Step
        icon={<Search size={13} />}
        title="Start an audit"
        description="Use Quick Actions to audit your selection, the current page, or select specific pages. You can also right-click > Plugins > Figxed to audit from the context menu."
        accent={accent}
        delay={0.05}
      />
      <Step
        icon={<Eye size={13} />}
        title="Review the Health Score"
        description="A percentage score shows how healthy your file is. Issues are grouped by category (Color, Spacing, Radius) and severity (Error, Warning, Info)."
        accent={accent}
        delay={0.1}
      />
      <Step
        icon={<Palette size={13} />}
        title="Filter and browse issues"
        description="Use the filter chips to narrow down by category or severity. Each issue card shows the node name, current value, and suggested DS token."
        tips={[
          'Click any issue to navigate to the node on the canvas',
          'Use the category chips to toggle Color, Spacing, Radius, etc.',
          'Severity filters let you focus on errors first',
        ]}
        accent={accent}
        delay={0.15}
      />
      <Step
        icon={<Zap size={13} />}
        title="Fix or ignore"
        description="Hit Fix to auto-bind the suggested variable. Or Ignore to skip it. Fixed and ignored issues are tracked in the current session."
        tips={[
          'Fix uses setBoundVariable() to bind the token',
          'Ignored issues can be toggled back with Show Fixed',
          'Re-audit preserves your original scope and selection',
        ]}
        accent={accent}
        delay={0.2}
      />
      <Step
        icon={<Download size={13} />}
        title="Export your report"
        description="Download results as JSON, CSV, or Markdown. You can also copy the Markdown report to clipboard for quick sharing."
        accent={accent}
        delay={0.25}
      />
    </div>
  );
}

function LibrariesSection() {
  const accent = '#f59e0b';
  return (
    <div>
      <SectionHeader
        icon={<Library size={16} className="text-figma-icon-secondary" />}
        title="Libraries Tab"
        subtitle="Discover external libraries used in your file"
        delay={0}
      />

      <Step
        icon={<Search size={13} />}
        title="Scan for libraries"
        description="Hit Scan to detect all external libraries referenced in your file. For large files, use the page picker to scan only the pages you need."
        accent={accent}
        delay={0.05}
      />
      <Step
        icon={<Library size={13} />}
        title="Browse detected libraries"
        description="Each library is listed with its resolved name and the number of components used from it. Expand a library to see every component."
        tips={[
          'Library names are resolved from the team library API',
          'If a name can\'t be resolved, a fallback identifier is shown',
        ]}
        accent={accent}
        delay={0.1}
      />
      <Step
        icon={<Layers size={13} />}
        title="Explore components"
        description="Inside each library, you'll see every component with its instance count and properties. This helps identify which library components are most used."
        accent={accent}
        delay={0.15}
      />
      <Step
        icon={<MousePointerClick size={13} />}
        title="Locate on canvas"
        description="Click the locate button on any component to navigate directly to one of its instances on the canvas. The viewport will scroll and zoom to the node."
        accent={accent}
        delay={0.2}
      />
    </div>
  );
}

function TipsSection() {
  const accent = 'var(--figma-color-bg-brand)';
  return (
    <div>
      <SectionHeader
        icon={<Zap size={16} className="text-figma-icon-secondary" />}
        title="Pro-tips"
        subtitle="Get the most out of Figxed"
        delay={0}
      />

      <Step
        icon={<Files size={13} />}
        title="Large files? Use the Page Picker"
        description="For files with 200k+ nodes, avoid scanning everything at once. Use the page picker to select only the pages you're working on."
        accent={accent}
        delay={0.05}
      />
      <Step
        icon={<Target size={13} />}
        title="Re-audit preserves context"
        description="After fixing issues, hit Re-Audit. It remembers your original scope — if you audited a selection, it re-audits the same selection."
        accent={accent}
        delay={0.1}
      />
      <Step
        icon={<FileText size={13} />}
        title="Right-click menu access"
        description="You can start audits from the right-click context menu: Plugins > Figxed > Audit Selection / Audit Page / Audit File."
        accent={accent}
        delay={0.15}
      />
      <Step
        icon={<Download size={13} />}
        title="Export for stakeholders"
        description="Use the Markdown export to generate a clean executive report with health score, summary stats, and top issues — ready to paste into Slack or Notion."
        accent={accent}
        delay={0.2}
      />
      <Step
        icon={<Sparkles size={13} />}
        title="Relaunch button"
        description="After your first audit, a Re-Audit button appears in the file's plugin menu. Use it to quickly re-run from anywhere without opening the full panel."
        accent={accent}
        delay={0.25}
      />
    </div>
  );
}
