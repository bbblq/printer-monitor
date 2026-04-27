const BEIJING_TIME_ZONE = 'Asia/Shanghai';

type BeijingParts = {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
};

function getBeijingParts(date: Date = new Date()): BeijingParts {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: BEIJING_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
    }, {});

    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
    };
}

function formatUtcSqlTimestamp(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function parseDbUtcTimestamp(value?: string | null): Date | null {
    const timestamp = value?.trim();
    if (!timestamp) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        return new Date(`${timestamp}T00:00:00Z`);
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
        return new Date(`${timestamp.replace(' ', 'T')}Z`);
    }

    const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
    const date = new Date(hasTimeZone ? timestamp : `${timestamp}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBeijingDate(date: Date = new Date()): string {
    const parts = getBeijingParts(date);
    return `${Number(parts.year)}/${Number(parts.month)}/${Number(parts.day)}`;
}

export function formatBeijingDateTime(date: Date = new Date()): string {
    const parts = getBeijingParts(date);
    return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatDbTimestampAsBeijingMonthDayTime(value?: string | null): string {
    const date = parseDbUtcTimestamp(value);
    if (!date) return value || '未知时间';

    const parts = getBeijingParts(date);
    return `${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function getBeijingDateKey(date: Date = new Date()): string {
    const parts = getBeijingParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getBeijingClock(date: Date = new Date()): { hour: number; minute: number } {
    const parts = getBeijingParts(date);
    return {
        hour: Number(parts.hour),
        minute: Number(parts.minute),
    };
}

export function getCurrentBeijingMonthRangeUtc(): { start: string; end: string } {
    const parts = getBeijingParts();
    const year = Number(parts.year);
    const monthIndex = Number(parts.month) - 1;

    return {
        start: formatUtcSqlTimestamp(new Date(Date.UTC(year, monthIndex, 1, -8, 0, 0))),
        end: formatUtcSqlTimestamp(new Date(Date.UTC(year, monthIndex + 1, 1, -8, 0, 0))),
    };
}

export function getCurrentBeijingYearRangeUtc(): { start: string; end: string } {
    const parts = getBeijingParts();
    const year = Number(parts.year);

    return {
        start: formatUtcSqlTimestamp(new Date(Date.UTC(year, 0, 1, -8, 0, 0))),
        end: formatUtcSqlTimestamp(new Date(Date.UTC(year + 1, 0, 1, -8, 0, 0))),
    };
}
