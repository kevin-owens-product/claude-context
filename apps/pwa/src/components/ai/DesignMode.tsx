import { useCallback } from 'react';
import clsx from 'clsx';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Type,
  Layout,
  Check,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { useApp } from '../../store/AppContext';
import type { ThemeVariant, LayoutPreset } from '../../types';

const THEME_OPTIONS: { value: ThemeVariant; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  { value: 'light', label: 'Light', icon: <Sun size={16} /> },
  { value: 'auto', label: 'System', icon: <Monitor size={16} /> },
];

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20];

const ACCENT_COLORS = [
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Pink', value: '#EC4899' },
];

const FONT_FAMILIES = [
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
  { label: 'Fira Code', value: 'Fira Code' },
  { label: 'Source Code Pro', value: 'Source Code Pro' },
  { label: 'Cascadia Code', value: 'Cascadia Code' },
  { label: 'Consolas', value: 'Consolas' },
];

export function DesignMode() {
  const { state, actions } = useApp();
  const design = state.design;

  const setTheme = useCallback(
    (theme: ThemeVariant) => {
      actions.updateDesign({ theme });
      actions.updateSettings({ theme });
      if (theme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else if (theme === 'dark') {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
        document.documentElement.classList.toggle('light', !prefersDark);
      }
    },
    [actions]
  );

  const setFontSize = useCallback(
    (fontSize: number) => {
      actions.updateDesign({ fontSize });
      actions.updateSettings({ fontSize });
    },
    [actions]
  );

  const setAccentColor = useCallback(
    (color: string) => {
      actions.updateDesign({ accentColor: color });
    },
    [actions]
  );

  const setFontFamily = useCallback(
    (fontFamily: string) => {
      actions.updateDesign({ fontFamily });
    },
    [actions]
  );

  const applyPreset = useCallback(
    (preset: LayoutPreset) => {
      actions.updateDesign({ activePreset: preset.id });
    },
    [actions]
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Theme Picker */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Palette size={12} />
          Theme
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={clsx(
                'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                design.theme === opt.value
                  ? 'border-pink-500/50 bg-pink-500/10 text-pink-300'
                  : 'border-border bg-surface-0 text-text-muted hover:border-surface-3'
              )}
            >
              {opt.icon}
              <span className="text-xs">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Accent Color
        </h3>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setAccentColor(color.value)}
              className={clsx(
                'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                design.accentColor === color.value
                  ? 'border-white scale-110'
                  : 'border-transparent hover:scale-105'
              )}
              style={{ backgroundColor: color.value }}
              aria-label={`${color.name} accent color`}
            >
              {design.accentColor === color.value && (
                <Check size={14} className="text-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Type size={12} />
          Font Size: {design.fontSize}px
        </h3>
        <div className="flex items-center gap-1">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg text-xs transition-all min-w-[36px]',
                design.fontSize === size
                  ? 'bg-pink-500/20 text-pink-300 font-bold'
                  : 'text-text-muted hover:bg-surface-1'
              )}
            >
              {size}
            </button>
          ))}
        </div>
        {/* Preview */}
        <div
          className="mt-2 p-2 bg-surface-1 rounded-lg font-mono text-text-secondary"
          style={{ fontSize: `${design.fontSize}px` }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
      </div>

      {/* Font Family */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Editor Font
        </h3>
        <div className="space-y-1">
          {FONT_FAMILIES.map((font) => (
            <button
              key={font.value}
              onClick={() => setFontFamily(font.value)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                design.fontFamily === font.value
                  ? 'bg-pink-500/10 text-pink-300 font-medium'
                  : 'text-text-muted hover:bg-surface-1'
              )}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Presets */}
      <div className="p-3">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Layout size={12} />
          Layout Presets
        </h3>
        <div className="space-y-2">
          {design.presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={clsx(
                'w-full text-left px-3 py-3 rounded-lg border transition-all',
                design.activePreset === preset.id
                  ? 'border-pink-500/50 bg-pink-500/10'
                  : 'border-border hover:border-surface-3'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'text-sm font-medium',
                    design.activePreset === preset.id ? 'text-pink-300' : 'text-text-primary'
                  )}
                >
                  {preset.name}
                </span>
                {design.activePreset === preset.id && (
                  <Badge size="sm" variant="primary">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">{preset.description}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
                <span>Sidebar: {preset.sidebarWidth}px</span>
                <span>AI Panel: {preset.aiPanelWidth}px</span>
                {preset.showTerminal && <span>+ Terminal</span>}
                {preset.showFileExplorer && <span>+ Explorer</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
