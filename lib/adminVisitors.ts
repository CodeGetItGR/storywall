import { EMPTY_VALUE, funnelBreakdown, type FunnelBreakdownRow, rateOf } from '@/lib/adminFunnel';
import type { LinkClickRowDto, VisitorMetricsDto } from '@/lib/api/types';
import { numberFormat } from '@/lib/format';

// Below this many visits a channel's sign-up rate says little: its row is tagged and shows no rate.
export const FEW_VISITS = 50;

export const VISITOR_LANGUAGES = ['el', 'en'] as const;
export const VISITOR_DEVICES = ['PHONE', 'DESKTOP', 'TABLET'] as const;

export function signupsPer100Visits(signups: number, visits: number): number | null {
    return visits > 0 ? (signups / visits) * 100 : null;
}

export function formatPer100(locale: string, value: number | null): string {
    if (value === null || !Number.isFinite(value)) return EMPTY_VALUE;
    return numberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

// A channel with no visits (Invite, Gift) isn't tagged: its sign-ups never came through GA.
export function isFewVisits(visits: number): boolean {
    return visits > 0 && visits < FEW_VISITS;
}

export function languageRows(languages: VisitorMetricsDto['languages']): FunnelBreakdownRow[] {
    return funnelBreakdown(Object.fromEntries(languages.map((row) => [row.language, row.visits])), VISITOR_LANGUAGES);
}

export function deviceRows(devices: VisitorMetricsDto['devices']): FunnelBreakdownRow[] {
    return funnelBreakdown(Object.fromEntries(devices.map((row) => [row.device, row.visits])), VISITOR_DEVICES);
}

// Sections arrive in page order. Each one's share is of all visitors in the range.
export function sectionRows(sections: VisitorMetricsDto['landing']['sections'], visitors: number): FunnelBreakdownRow[] {
    return sections.map((row) => ({ key: row.section, value: row.visitors, ratio: rateOf(row.visitors, visitors) }));
}

// A link click row's key: one row per link, page and placement.
export function linkClickRowKey(row: LinkClickRowDto): string {
    return `${row.target}|${row.page}|${row.placement}`;
}
