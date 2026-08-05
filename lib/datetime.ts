const defaultTimeFormat: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
};

function parseDate(value: string | number | Date): Date | null {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

export function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return '';

    const date = parseDate(iso);
    if (!date) return '';

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(locale: string, value: string | number | Date, options: Intl.DateTimeFormatOptions): string {
    const date = parseDate(value);
    if (!date) return '';

    return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatTime(locale: string, value: string | null, options: Intl.DateTimeFormatOptions = defaultTimeFormat): string {
    if (!value) return '';

    return formatDate(locale, value, options);
}

export function formatTimeRange(locale: string, startAt: string | null, endAt: string | null, fallbackLabel: string): string {
    const start = formatTime(locale, startAt);
    const end = formatTime(locale, endAt);

    if (start && end && start !== end) return `${start} - ${end}`;
    if (start) return start;
    return fallbackLabel;
}
