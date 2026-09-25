import type { WithdrawalAdminDto, WithdrawalFraudSignalDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

// Backend timestamps: `2026-12-31T09:36Z`, `…:28.980763Z`, `…:29.992579600+03:00`.
const ISO_DATE_TIME = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})/g;

export function formatAdminDateTime(locale: string, value: string): string {
    return formatDate(locale, value, DATE_TIME_FORMAT) || value;
}

// Signal `observed` strings are generated English that may embed raw timestamps
// ("paid for 2026-10-03T18:00Z, now set to …"); only the timestamps are rewritten.
export function formatInlineDates(locale: string, text: string): string {
    return text.replace(ISO_DATE_TIME, (match) => formatAdminDateTime(locale, match));
}

// --- Recommendation ---

const GUIDANCE_HEADING_KEYS = {
    'WHAT IS WITHDRAWN': 'withdrawn',
    'WHAT THE LAW REQUIRES': 'law',
    'WHAT THE COMPUTATION PRODUCED': 'refund',
    'YOUR DECISION': 'decision',
} as const;

export type WithdrawalGuidanceKey = (typeof GUIDANCE_HEADING_KEYS)[keyof typeof GUIDANCE_HEADING_KEYS];

export type WithdrawalGuidanceSection = {
    key: WithdrawalGuidanceKey | null;
    // Raw heading, used only when the backend adds one the console has no label for.
    heading: string | null;
    paragraphs: string[];
};

// Restates the signal list, code names included, so it is not shown.
const HIDDEN_GUIDANCE_HEADINGS = new Set(['WHY THIS WAS HELD']);

function isHeadingLine(line: string): boolean {
    return /[A-Z]/.test(line) && line === line.toUpperCase();
}

function toGuidanceSection(lines: string[]): WithdrawalGuidanceSection {
    const [first, ...rest] = lines;
    if (rest.length === 0 || !isHeadingLine(first)) return { key: null, heading: null, paragraphs: lines };

    const key = GUIDANCE_HEADING_KEYS[first as keyof typeof GUIDANCE_HEADING_KEYS] ?? null;
    return { key, heading: key ? null : first, paragraphs: rest };
}

/**
 * Splits the generated recommendation into its blank-line-separated sections. The
 * "Your decision" section is returned apart so it can sit next to the decision
 * controls. Text that does not follow the section layout falls through as plain
 * paragraphs rather than being dropped.
 */
export function splitWithdrawalGuidance(text: string): { sections: WithdrawalGuidanceSection[]; decision: WithdrawalGuidanceSection | null } {
    const all = text
        .split(/\n\s*\n/)
        .map((block) =>
            block
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
        )
        .filter((lines) => lines.length > 0 && !HIDDEN_GUIDANCE_HEADINGS.has(lines[0]))
        .map(toGuidanceSection);

    return {
        sections: all.filter((section) => section.key !== 'decision'),
        decision: all.find((section) => section.key === 'decision') ?? null,
    };
}

// --- Signals ---

// Every evaluated signal is shown (guide §9); the ones that fired come first.
export function sortWithdrawalSignals(signals: WithdrawalFraudSignalDto[]): WithdrawalFraudSignalDto[] {
    return [...signals].sort((a, b) => Number(b.fired) - Number(a.fired));
}

// --- Usage facts ---

// Only the facts no signal already states. Guests, media, prior withdrawals,
// disputes and risk level are each spelled out by a signal; the request date is
// in the row header.
const WITHDRAWAL_FACTS = [
    { key: 'paidAt', kind: 'date' },
    { key: 'activatedStartAt', kind: 'date' },
    { key: 'eventStartAt', kind: 'date' },
    { key: 'eventEndAt', kind: 'date' },
    { key: 'accountCreatedAt', kind: 'date' },
    { key: 'postsEverCreated', kind: 'count' },
    { key: 'wishesCollected', kind: 'count' },
] as const;

export type WithdrawalFactKey = (typeof WITHDRAWAL_FACTS)[number]['key'];

export function formatWithdrawalFacts(usageFacts: Record<string, unknown> | null, locale: string): Array<{ key: WithdrawalFactKey; value: string }> {
    if (!usageFacts) return [];

    return WITHDRAWAL_FACTS.filter(({ key }) => key in usageFacts).map(({ key, kind }) => {
        const value = usageFacts[key];
        if (value === null || value === undefined) return { key, value: '—' };
        if (kind === 'date' && typeof value === 'string') return { key, value: formatAdminDateTime(locale, value) };
        if (typeof value === 'number') return { key, value: value.toLocaleString(locale) };
        return { key, value: String(value) };
    });
}

// --- Keep event day ---

export type KeepEventDayAvailability = 'available' | 'noConsent' | 'notDue' | 'notApplicable';

/**
 * Whether release can keep the event-day share (guide §9). Only activation and
 * upgrade lines have an event day; without consent nothing is kept; and the date
 * paid for must have passed when the host withdrew, or the backend answers 5083.
 */
export function getKeepEventDayAvailability(row: WithdrawalAdminDto): KeepEventDayAvailability {
    const dayLines = row.request.lines.filter((line) => line.orderKind === 'ACTIVATION' || line.orderKind === 'UPGRADE');
    if (!row.usageFacts || dayLines.length === 0) return 'notApplicable';
    if (!dayLines.some((line) => line.basis === 'CONSENTED_PRO_RATA')) return 'noConsent';

    const paidForStart = row.usageFacts.activatedStartAt;
    if (typeof paidForStart !== 'string') return 'notDue';

    const paidForTime = new Date(paidForStart).getTime();
    const requestedTime = new Date(row.request.createdAt).getTime();
    if (Number.isNaN(paidForTime) || Number.isNaN(requestedTime) || requestedTime < paidForTime) return 'notDue';

    return 'available';
}
