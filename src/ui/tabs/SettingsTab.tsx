import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Check, ChevronRight } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { postToPlugin } from '../hooks/usePluginMessages';
import { DEFAULT_CONFIG } from '../../types/common';
import type { ScanOptions, IssueSeverity } from '../../types/common';

const ALL_RULES = [
  { id: 'padding-without-variable', label: 'Padding Without Variable' },
  { id: 'gap-without-variable', label: 'Gap Without Variable' },
  { id: 'color-without-variable', label: 'Color Without Variable' },
  { id: 'radius-without-variable', label: 'Radius Without Variable' },
];

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string }[] = [
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const THRESHOLD_DEFS = [
  {
    key: 'spacing' as const,
    label: 'Spacing tolerance',
    unit: 'px',
    min: 0,
    max: 16,
    step: 1,
    path: 'audit.thresholds.spacing',
  },
  {
    key: 'colorDeltaE' as const,
    label: 'Color similarity (Delta E)',
    unit: '',
    min: 0,
    max: 30,
    step: 1,
    path: 'audit.thresholds.colorDeltaE',
  },
  {
    key: 'radius' as const,
    label: 'Radius tolerance',
    unit: 'px',
    min: 0,
    max: 8,
    step: 0.5,
    path: 'audit.thresholds.radius',
  },
];

const SCAN_OPTIONS: { key: keyof ScanOptions; label: string }[] = [
  { key: 'ignoreHiddenLayers', label: 'Ignore hidden layers' },
  { key: 'groupDetachedComponents', label: 'Group detached components' },
  { key: 'includeTextStyles', label: 'Include text styles' },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="toggle-switch shrink-0"
      data-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

export function SettingsTab() {
  const config = useStore((s) => s.config);
  const updateConfigValue = useStore((s) => s.updateConfigValue);
  const [saveFlash, setSaveFlash] = useState(false);

  /** Optimistically update local store + persist to sandbox */
  const updateConfig = (path: string, value: unknown) => {
    updateConfigValue(path, value);
    postToPlugin({ type: 'UPDATE_CONFIG', payload: { path, value } });
    flashSave();
  };

  /** Persist user-specific preferences to clientStorage */
  const updateUserConfig = (path: string, value: unknown) => {
    updateConfigValue(path, value);
    postToPlugin({ type: 'SAVE_USER_CONFIG', payload: { path, value } });
    flashSave();
  };

  const flashSave = () => {
    setSaveFlash(true);
  };

  useEffect(() => {
    if (!saveFlash) return;
    const timer = setTimeout(() => setSaveFlash(false), 1500);
    return () => clearTimeout(timer);
  }, [saveFlash]);

  const handleRuleToggle = (ruleId: string, enabled: boolean) => {
    const currentRules = config.audit.enabledRules;
    const newRules = enabled
      ? [...currentRules, ruleId]
      : currentRules.filter((r) => r !== ruleId);
    updateUserConfig('audit.enabledRules', newRules);
  };

  const handleThresholdChange = (path: string, value: number) => {
    updateUserConfig(path, value);
  };

  const handleScanOptionChange = (key: keyof ScanOptions, value: boolean) => {
    updateUserConfig(`adoption.scanOptions.${key}`, value);
  };

  const handleSeverityOverride = (ruleId: string, severity: IssueSeverity) => {
    const overrides = { ...config.audit.severityOverrides, [ruleId]: severity };
    updateUserConfig('audit.severityOverrides', overrides);
  };

  const handleReset = () => {
    updateConfig('audit.enabledRules', DEFAULT_CONFIG.audit.enabledRules);
    updateConfig('audit.thresholds', DEFAULT_CONFIG.audit.thresholds);
    updateConfig('audit.severityOverrides', DEFAULT_CONFIG.audit.severityOverrides);
    updateConfig('adoption.scanOptions', DEFAULT_CONFIG.adoption.scanOptions);
    postToPlugin({
      type: 'SAVE_USER_CONFIG',
      payload: { path: 'audit', value: DEFAULT_CONFIG.audit },
    });
    postToPlugin({
      type: 'SAVE_USER_CONFIG',
      payload: { path: 'adoption.scanOptions', value: DEFAULT_CONFIG.adoption.scanOptions },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <motion.div
        className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-5"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.06 }}
      >
        {/* Save indicator */}
        <AnimatePresence>
          {saveFlash && (
            <motion.div
              className="flex items-center gap-1.5 text-2xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-success) 10%, var(--figma-color-bg))',
                color: 'var(--figma-color-bg-success)',
              }}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Check size={12} />
              Saved
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audit Rules */}
        <motion.section variants={sectionVariants}>
          <h3 className="text-xs font-semibold text-figma-text mb-2.5">Audit Rules</h3>
          <div className="card p-0 divide-y divide-figma-border overflow-hidden">
            {ALL_RULES.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-figma-bg-hover transition-colors"
              >
                <span className="text-xs text-figma-text">{rule.label}</span>
                <ToggleSwitch
                  checked={config.audit.enabledRules.includes(rule.id)}
                  onChange={(checked) => handleRuleToggle(rule.id, checked)}
                />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Severity Overrides */}
        <motion.section variants={sectionVariants}>
          <h3 className="text-xs font-semibold text-figma-text mb-1">Severity Overrides</h3>
          <p className="text-2xs text-figma-text-tertiary mb-2.5 leading-relaxed">
            Override the default severity level for each rule.
          </p>
          <div className="card p-0 divide-y divide-figma-border overflow-hidden">
            {ALL_RULES.map((rule) => {
              const currentSeverity =
                config.audit.severityOverrides[rule.id] ?? getDefaultSeverity(rule.id);
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-figma-bg-hover transition-colors"
                >
                  <span className="text-xs text-figma-text-secondary truncate flex-1 mr-3">
                    {rule.label}
                  </span>
                  <select
                    value={currentSeverity}
                    onChange={(e) =>
                      handleSeverityOverride(rule.id, e.target.value as IssueSeverity)
                    }
                    className="text-xs bg-figma-bg-secondary border border-figma-border rounded-lg px-2 py-1 text-figma-text cursor-pointer
                      focus:outline-none focus:ring-2 focus:ring-figma-brand/30 focus:border-figma-brand transition-all"
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Thresholds */}
        <motion.section variants={sectionVariants}>
          <h3 className="text-xs font-semibold text-figma-text mb-2.5">Thresholds</h3>
          <div className="space-y-4">
            {THRESHOLD_DEFS.map((t) => {
              const value = config.audit.thresholds[t.key];
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-figma-text-secondary">{t.label}</span>
                    <span
                      className="text-xs font-semibold text-figma-text tabular-nums px-2 py-0.5 rounded-md bg-figma-bg-secondary"
                    >
                      {value}{t.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={t.min}
                    max={t.max}
                    step={t.step}
                    value={value}
                    onChange={(e) => handleThresholdChange(t.path, Number(e.target.value))}
                    className="w-full h-1.5 bg-figma-bg-tertiary rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-figma-brand
                      [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-figma-brand-hover
                      [&::-webkit-slider-thumb]:transition-colors"
                  />
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Scan Options */}
        <motion.section variants={sectionVariants}>
          <h3 className="text-xs font-semibold text-figma-text mb-2.5">Scan Options</h3>
          <div className="card p-0 divide-y divide-figma-border overflow-hidden">
            {SCAN_OPTIONS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-figma-bg-hover transition-colors"
              >
                <span className="text-xs text-figma-text">{label}</span>
                <ToggleSwitch
                  checked={config.adoption.scanOptions[key]}
                  onChange={(checked) => handleScanOptionChange(key, checked)}
                />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Reset */}
        <motion.section className="pt-1" variants={sectionVariants}>
          <button
            onClick={handleReset}
            className="btn-ghost flex items-center gap-1.5 text-xs text-figma-text-secondary hover:text-figma-text w-full"
          >
            <RotateCcw size={12} />
            Reset to defaults
            <ChevronRight size={12} className="ml-auto opacity-40" />
          </button>
        </motion.section>
      </motion.div>

      {/* Fixed footer — signature */}
      <div className="shrink-0 border-t border-figma-border bg-figma-bg px-3.5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xs text-figma-text-tertiary">
              Figxed by{' '}
              <a
                href="https://www.johanvillalba.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-figma-text-secondary hover:text-figma-text transition-colors underline decoration-figma-border hover:decoration-current cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://www.johanvillalba.com', '_blank');
                }}
              >
                Sho Villalba
              </a>
            </p>
          </div>
          <span
            className="text-2xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--figma-color-bg-brand) 10%, var(--figma-color-bg))',
              color: 'var(--figma-color-text-brand)',
            }}
          >
            v{config.version}
          </span>
        </div>
      </div>
    </div>
  );
}

function getDefaultSeverity(ruleId: string): IssueSeverity {
  switch (ruleId) {
    case 'color-without-variable':
      return 'error';
    case 'padding-without-variable':
    case 'gap-without-variable':
      return 'warning';
    case 'radius-without-variable':
      return 'warning';
    default:
      return 'warning';
  }
}
