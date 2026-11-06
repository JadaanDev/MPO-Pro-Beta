import type { ThemeConfig } from '../../types/themes';
import { BigNumberInput } from '../../big-studio/BigNumberInput';
export function LayoutSizingControls({ config, onChange, onCommit }: {
    config: ThemeConfig;
    onChange: (fn: (c: ThemeConfig) => ThemeConfig) => void;
    onCommit?: (description?: string) => void;
}) {
    const set = (patch: Partial<ThemeConfig>) => { onChange(c => ({ ...c, ...patch })); onCommit?.('Updated layout sizing policy'); };
    return <section className="layout-sizing-controls" style={{ display: 'grid', gap: 10 }}>
    <label>Element boundaries <select aria-label="Element boundaries" value={config.layoutBoundary || 'legacy'} onChange={e => set({ layoutBoundary: e.target.value as ThemeConfig['layoutBoundary'] })}><option value="legacy">Theme default (preserve existing layout)</option><option value="constrain">Constrain inside frame</option><option value="overflow">Allow overflow with capture space</option><option value="grow">Grow frame surface around elements</option></select></label>
    <small>Grow extends the background around moved elements while preserving their layout. Overflow and grow include extra capture space.</small>
    <label>Card width behavior <select aria-label="Card width behavior" value={config.widthMode || 'fixed'} onChange={e => set({ widthMode: e.target.value as ThemeConfig['widthMode'] })}><option value="fixed">Fixed / theme default</option><option value="content">Hug content within bounds</option></select></label>
    {config.widthMode === 'content' && <><BigNumberInput label="Minimum content width" unit="px" value={config.contentMinWidth ?? 320} onCommit={value => { if (value !== undefined && value > 0)
        set({ contentMinWidth: value, contentMaxWidth: Math.max(value, config.contentMaxWidth ?? 600) }); }}/><BigNumberInput label="Maximum content width" unit="px" value={config.contentMaxWidth ?? 600} onCommit={value => { if (value !== undefined && value > 0)
        set({ contentMaxWidth: Math.max(config.contentMinWidth ?? 320, value) }); }}/><small>The outer capture footprint reserves the maximum width. Changing songs resizes the card inside it.</small></>}
  </section>;
}
export function studioSizePresets(surface?: 'obs' | 'tiktok' | 'desktop' | 'big') {
    const common = [{ label: 'Compact', width: 380, height: 140, scale: .85 }, { label: 'Mini', width: 420, height: 160, scale: .9 }, { label: 'Wide', width: 560, height: 130, scale: .9 }, { label: 'Standard', width: 490, height: 180, scale: 1 }, { label: 'Expanded', width: 600, height: 220, scale: 1.05 }, { label: 'Auto', width: 0, height: 0, scale: 1 }];
    if (surface === 'obs')
        return [{ label: 'Lower Third', width: 680, height: 140, scale: 1 }, { label: 'Compact Box', width: 420, height: 170, scale: 1 }, { label: 'Micro Ticker', width: 760, height: 72, scale: 1 }, ...common];
    if (surface === 'tiktok')
        return [{ label: 'Story Card', width: 360, height: 640, scale: 1 }, { label: 'Compact Square', width: 340, height: 340, scale: 1 }, { label: 'Slim Banner', width: 360, height: 130, scale: 1 }, ...common];
    if (surface === 'desktop')
        return [{ label: 'Compact Island', width: 380, height: 120, scale: 1 }, { label: 'Standard Card', width: 490, height: 180, scale: 1 }, { label: 'Expanded Info', width: 580, height: 220, scale: 1 }, ...common];
    return common;
}
