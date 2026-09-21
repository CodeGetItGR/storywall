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

function formatDatetimeLocalValue(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function roundUpToMinute(date: Date): Date {
    const rounded = new Date(date);
    rounded.setSeconds(0, 0);
    if (date.getSeconds() > 0 || date.getMilliseconds() > 0) {
        rounded.setMinutes(rounded.getMinutes() + 1);
    }
    return rounded;
}

export function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return '';

    const date = parseDate(iso);
    if (!date) return '';

    return formatDatetimeLocalValue(date);
}

export function getCurrentDatetimeLocalValue(referenceDate = new Date()): string {
    return formatDatetimeLocalValue(roundUpToMinute(referenceDate));
}

export function parseDatetimeLocalValue(value: string | null | undefined): Date | null {
    if (!value) return null;

    return parseDate(value);
}

// A datetime-local input yields "YYYY-MM-DDTHH:mm" with no zone offset, which
// Spring rejects (400) for OffsetDateTime fields. Convert at the form edge to
// a full ISO-8601 instant before it goes into a request body.
export function datetimeLocalValueToIso(value: string | null | undefined): string | null {
    return parseDatetimeLocalValue(value)?.toISOString() ?? null;
}

export function getLaterDatetimeLocalValue(...values: Array<string | null | undefined>): string | null {
    let latest: Date | null = null;

    for (const value of values) {
        const date = parseDatetimeLocalValue(value);
        if (!date) continue;
        if (!latest || date.getTime() > latest.getTime()) {
            latest = date;
        }
    }

    return latest ? formatDatetimeLocalValue(latest) : null;
}

export function getScheduleDatetimeLocalBounds({
    startAt,
    endAt,
    maxLeadDays,
    referenceDate = new Date(),
}: {
    startAt?: string | null;
    endAt?: string | null;
    // Furthest ahead the start may be scheduled, counted from `referenceDate`.
    maxLeadDays?: number;
    referenceDate?: Date;
}): { startAtMin: string; startAtMax?: string; endAtMin: string } {
    const nowAt = getCurrentDatetimeLocalValue(referenceDate);
    const leadCap = maxLeadDays !== undefined ? addDatetimeLocalDuration(nowAt, { days: maxLeadDays }) : null;
    const endCap = isDatetimeLocalAfter(endAt, nowAt) ? endAt : null;
    const startAtMax = getEarlierDatetimeLocalValue(leadCap, endCap) ?? undefined;
    const endAtMin = getLaterDatetimeLocalValue(nowAt, startAt) ?? nowAt;

    return { startAtMin: nowAt, startAtMax, endAtMin };
}

export function getEarlierDatetimeLocalValue(...values: Array<string | null | undefined>): string | null {
    let earliest: Date | null = null;

    for (const value of values) {
        const date = parseDatetimeLocalValue(value);
        if (!date) continue;
        if (!earliest || date.getTime() < earliest.getTime()) {
            earliest = date;
        }
    }

    return earliest ? formatDatetimeLocalValue(earliest) : null;
}

export function addDatetimeLocalDuration(value: string | null | undefined, duration: { days?: number; hours?: number }): string | null {
    const date = parseDatetimeLocalValue(value);
    if (!date) return null;

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + (duration.days ?? 0));
    nextDate.setHours(nextDate.getHours() + (duration.hours ?? 0));

    return formatDatetimeLocalValue(nextDate);
}

export function isDatetimeLocalBefore(left: string | null | undefined, right: string | null | undefined): boolean {
    const leftDate = parseDatetimeLocalValue(left);
    const rightDate = parseDatetimeLocalValue(right);
    if (!leftDate || !rightDate) return false;

    return leftDate.getTime() < rightDate.getTime();
}

export function isDatetimeLocalAfter(left: string | null | undefined, right: string | null | undefined): boolean {
    const leftDate = parseDatetimeLocalValue(left);
    const rightDate = parseDatetimeLocalValue(right);
    if (!leftDate || !rightDate) return false;

    return leftDate.getTime() > rightDate.getTime();
}

export function getDaysUntil(value: string | number | Date | null | undefined, referenceDate = new Date()): number | null {
    if (value === null || value === undefined) return null;

    const date = parseDate(value);
    if (!date) return null;

    return Math.max(0, Math.ceil((date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)));
}

export function formatDate(locale: string | undefined, value: string | number | Date, options: Intl.DateTimeFormatOptions): string {
    const date = parseDate(value);
    if (!date) return '';

    return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatTime(locale: string, value: string | null, options: Intl.DateTimeFormatOptions = defaultTimeFormat): string {
    if (!value) return '';

    return formatDate(locale, value, options);
}

export function formatTimeRange(
    locale: string,
    startAt: string | null,
    endAt: string | null,
    fallbackLabel: string,
    options: Intl.DateTimeFormatOptions = defaultTimeFormat
): string {
    const start = formatTime(locale, startAt, options);
    const end = formatTime(locale, endAt, options);

    if (start && end && start !== end) return `${start} - ${end}`;
    if (start) return start;
    return fallbackLabel;
}

export function formatShortDateTime(value: string | number | Date, locale?: string): string {
    return formatDate(locale ?? undefined, value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatEventListDate(startAt: string | undefined, locale: string, atLabel: string): string | null {
    if (!startAt) return null;

    const date = parseDate(startAt);
    if (!date) return null;

    const weekday = formatDate(locale, date, { weekday: 'short' });
    const calendarDate = formatDate(locale, date, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
    const time = formatDate(locale, startAt, {
        hour: 'numeric',
        minute: date.getMinutes() === 0 ? undefined : '2-digit',
    });

    return `${weekday}, ${calendarDate} ${atLabel} ${time}`.toUpperCase();
}
