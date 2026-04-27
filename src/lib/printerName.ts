export type PrinterNameSource = {
    name?: string | null;
    brand?: string | null;
    model?: string | null;
    location?: string | null;
    ip?: string | null;
};

export function getPrinterDisplayName(printer: PrinterNameSource): string {
    const explicitName = printer.name?.trim();
    if (explicitName) return explicitName;

    const modelName = [printer.brand, printer.model]
        .map(value => value?.trim())
        .filter(Boolean)
        .join(' ');
    if (modelName) return modelName;

    const location = printer.location?.trim();
    if (location) return location;

    const ip = printer.ip?.trim();
    if (ip) return ip;

    return '未命名打印机';
}

export function printerDisplayNameSql(alias = 'p'): string {
    const prefix = alias ? `${alias}.` : '';

    return `COALESCE(
        NULLIF(TRIM(${prefix}name), ''),
        NULLIF(TRIM(COALESCE(${prefix}brand, '') || ' ' || COALESCE(${prefix}model, '')), ''),
        NULLIF(TRIM(${prefix}location), ''),
        NULLIF(TRIM(${prefix}ip), ''),
        '未命名打印机'
    )`;
}
