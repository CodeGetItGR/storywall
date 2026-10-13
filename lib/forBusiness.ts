import type { Locale } from '@/i18n/config';
import type { PartnerProgramSummaryDto } from '@/lib/api/types';

// Shown without a count when Spring can't be reached. Must match the real cap.
export const FOUNDING_SPOTS_FALLBACK_TOTAL = 20;

export type FoundingBlock = { kind: 'count'; left: number; total: number } | { kind: 'limited'; total: number } | { kind: 'hidden' };

export function foundingBlock(summary: PartnerProgramSummaryDto | null): FoundingBlock {
    if (!summary) return { kind: 'limited', total: FOUNDING_SPOTS_FALLBACK_TOTAL };
    if (summary.foundingSpotsLeft <= 0) return { kind: 'hidden' };
    return { kind: 'count', left: summary.foundingSpotsLeft, total: summary.foundingSpotsTotal };
}

function isGreek(tag: string): boolean {
    return tag.toLowerCase().split('-')[0] === 'el';
}

// The banner pointing at the page's twin. The Greek page offers English to
// anyone without Greek; the English page offers Greek only when it is the
// browser's first language, since most Greeks also read English.
export function shouldSuggestTwin(pageLocale: Locale, browserLanguages: readonly string[]): boolean {
    if (browserLanguages.length === 0) return false;
    if (pageLocale === 'el') return !browserLanguages.some(isGreek);
    return isGreek(browserLanguages[0]);
}
