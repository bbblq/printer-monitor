const WASTE_TONER_LABEL = '废粉盒';

/**
 * Convert the different names reported by printers into the labels used by
 * the UI. In particular, “废弃碳粉” and “废粉盒” describe the same supply.
 */
export function normalizeColorName(name: string | null | undefined): string {
    const value = name?.trim() || '未知';
    const lower = value.toLowerCase();

    if (
        lower.includes('waste') ||
        value.includes('废弃碳粉') ||
        value.includes('废碳粉') ||
        value.includes('废粉盒') ||
        value.includes('废粉')
    ) {
        return WASTE_TONER_LABEL;
    }
    if (lower.includes('black') || value.includes('黑')) return '黑色';
    if (lower.includes('cyan') || value.includes('青')) return '青色';
    if (lower.includes('magenta') || value.includes('品红') || value.includes('洋红')) return '品红';
    if (lower.includes('yellow') || value.includes('黄')) return '黄色';

    return value;
}

export function getColorHex(name: string | null | undefined): string {
    const normalized = normalizeColorName(name);
    const lower = normalized.toLowerCase();

    if (lower === '黑色' || lower.includes('black')) return '#1e293b';
    if (lower === '青色' || lower.includes('cyan')) return '#06b6d4';
    if (lower === '品红' || lower.includes('magenta')) return '#d946ef';
    if (lower === '黄色' || lower.includes('yellow')) return '#eab308';
    if (normalized === WASTE_TONER_LABEL) return '#9ca3af';
    return '#64748b';
}
