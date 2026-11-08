import type { ThemeConfig } from '../types/themes';

const geometryKeys = ['elementPositions', 'scale', 'customWidth', 'customHeight', 'desktopScale', 'desktopCustomWidth', 'desktopCustomHeight', 'useSeparateDesktopSize', 'bigCustomWidth', 'bigCustomHeight', 'layoutBoundary', 'widthMode', 'contentMinWidth', 'contentMaxWidth', 'framePadding', 'artSize', 'progressHeight', 'visualizerHeight'] as const;

/** Styling may reflow naturally; explicit Arrange geometry remains unchanged. */
export function preserveArrangeGeometry(before: ThemeConfig, proposed: ThemeConfig): ThemeConfig {
    const next = { ...proposed };
    for (const key of geometryKeys) {
        if (Object.prototype.hasOwnProperty.call(before, key)) Object.assign(next, { [key]: before[key] });
        else delete next[key];
    }
    return JSON.stringify(next) === JSON.stringify(before) ? before : next;
}
