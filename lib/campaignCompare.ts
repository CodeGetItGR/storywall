import type { CampaignCountsDto, CampaignDayDto, CampaignDto, CampaignListItemDto } from '@/lib/api/types';

// How the Campaigns page compares: against the previous period, between campaigns and between a
// campaign's platforms. The thresholds are a starting point, to tune once real numbers come in.

// Fewer visitors than this are too few to judge, on either side of a comparison.
export const VERDICT_MIN_VISITORS = 20;
// This many visitors with no sign-up and no sale is a problem worth calling out.
export const VERDICT_MANY_VISITORS = 100;
// A rate this many times the other side's is better; at this share of it or less, worse.
export const VERDICT_BETTER = 1.5;
export const VERDICT_WORSE = 0.5;
// Below this on both sides, a change reads as a count ("2 more"); a percent of small numbers says little.
export const CHANGE_COUNT_BELOW = 10;

export type ChangeDirection = 'up' | 'down';

export type Change = { kind: 'same' } | { kind: 'count'; direction: ChangeDirection; amount: number } | { kind: 'percent'; direction: ChangeDirection; ratio: number };

// How a number moved against the previous period. Null with no previous period (all time). A rise
// from zero has no percent, so it is a count.
export function changeOf(current: number, previous: number | null | undefined, countBelow: number = CHANGE_COUNT_BELOW): Change | null {
    if (previous === null || previous === undefined) return null;
    const difference = current - previous;
    if (difference === 0) return { kind: 'same' };
    const direction: ChangeDirection = difference > 0 ? 'up' : 'down';
    if (previous === 0 || (current < countBelow && previous < countBelow)) return { kind: 'count', direction, amount: Math.abs(difference) };
    return { kind: 'percent', direction, ratio: Math.abs(difference) / previous };
}

export type MoneyChange = { currency: string; change: Change };

// Revenue moves as one number only in one currency. Money always reads as a percent, or as the amount
// when it rose from nothing.
export function revenueChangeOf(current: Record<string, number> | null, previous: Record<string, number> | null | undefined): MoneyChange | null {
    if (!current || !previous) return null;
    const currencies = new Set([...Object.keys(current), ...Object.keys(previous)]);
    if (currencies.size !== 1) return null;
    const [currency] = currencies;
    const change = changeOf(current[currency] ?? 0, previous[currency] ?? 0, 0);
    return change ? { currency, change } : null;
}

export type VerdictMeasure = 'sales' | 'signedUp';

export type Verdict =
    | { kind: 'early' }
    | { kind: 'noSignUps' }
    // multiple is null when the other side's rate is zero.
    | { kind: 'better'; measure: VerdictMeasure; multiple: number | null }
    | { kind: 'worse'; measure: VerdictMeasure }
    | { kind: 'average'; measure: VerdictMeasure };

export type VerdictCounts = Pick<CampaignCountsDto, 'visitors' | 'signedUp' | 'sales'>;

// What a rate counts per visitor: sales, or sign-ups while there is no sale at all.
export function rateMeasure(counts: Pick<CampaignCountsDto, 'sales'>): VerdictMeasure {
    return counts.sales > 0 ? 'sales' : 'signedUp';
}

// One side's rate against the rest added up: a campaign against the other campaigns, or a platform
// against the campaign's other platforms. Others under VERDICT_MIN_VISITORS are left out, so a link
// with three visits doesn't set the average. Null when there is nothing to compare with.
export function verdictOf(self: VerdictCounts, others: readonly VerdictCounts[]): Verdict | null {
    if (self.visitors < VERDICT_MIN_VISITORS) return { kind: 'early' };
    if (self.visitors >= VERDICT_MANY_VISITORS && self.signedUp === 0 && self.sales === 0) return { kind: 'noSignUps' };

    const counted = others.filter((other) => other.visitors >= VERDICT_MIN_VISITORS);
    if (counted.length === 0) return null;
    const rest = counted.reduce(
        (sum, other) => ({ visitors: sum.visitors + other.visitors, signedUp: sum.signedUp + other.signedUp, sales: sum.sales + other.sales }),
        { visitors: 0, signedUp: 0, sales: 0 },
    );

    const measure = rateMeasure({ sales: self.sales + rest.sales });
    const own = self[measure] / self.visitors;
    const theirs = rest[measure] / rest.visitors;
    if (theirs === 0) return own > 0 ? { kind: 'better', measure, multiple: null } : { kind: 'average', measure };

    const multiple = own / theirs;
    if (multiple >= VERDICT_BETTER) return { kind: 'better', measure, multiple: Math.round(multiple * 10) / 10 };
    if (multiple <= VERDICT_WORSE) return { kind: 'worse', measure };
    return { kind: 'average', measure };
}

export const EMPTY_COUNTS: CampaignCountsDto = {
    visits: 0,
    visitors: 0,
    createClicks: 0,
    plansClicks: 0,
    planPicks: 0,
    signedUp: 0,
    createdEvent: 0,
    paidHost: 0,
    sales: 0,
    salesRevenueMinorByCurrency: {},
};

const COUNT_KEYS = ['visits', 'visitors', 'createClicks', 'plansClicks', 'planPicks', 'signedUp', 'createdEvent', 'paidHost', 'sales'] as const;

// Every number added up. Revenue is left out as soon as one side has none (a marketing caller).
export function sumCounts(all: readonly CampaignCountsDto[]): CampaignCountsDto {
    const total: CampaignCountsDto = { ...EMPTY_COUNTS, salesRevenueMinorByCurrency: {} };
    for (const counts of all) {
        for (const key of COUNT_KEYS) total[key] += counts[key];
        if (counts.salesRevenueMinorByCurrency === null || total.salesRevenueMinorByCurrency === null) {
            total.salesRevenueMinorByCurrency = null;
            continue;
        }
        for (const [currency, minor] of Object.entries(counts.salesRevenueMinorByCurrency)) {
            total.salesRevenueMinorByCurrency[currency] = (total.salesRevenueMinorByCurrency[currency] ?? 0) + minor;
        }
    }
    return total;
}

export type Trend = 'up' | 'down' | 'flat';

// The range's second half against its first. The middle day of an odd range counts in neither.
export function trendOf(daily: readonly CampaignDayDto[]): Trend {
    const half = Math.floor(daily.length / 2);
    if (half === 0) return 'flat';
    const sum = (days: readonly CampaignDayDto[]) => days.reduce((total, day) => total + day.visitors, 0);
    const first = sum(daily.slice(0, half));
    const second = sum(daily.slice(daily.length - half));
    if (second > first) return 'up';
    if (second < first) return 'down';
    return 'flat';
}

// An SVG polyline's points for a row of numbers: left to right across width, the highest at the top.
export function sparklinePoints(values: readonly number[], width: number, height: number): string {
    if (values.length === 0) return '';
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? width / (values.length - 1) : 0;
    return values.map((value, index) => `${(index * step).toFixed(1)},${(height - (value / max) * height).toFixed(1)}`).join(' ');
}

export type CampaignTab = 'current' | 'past';

export function campaignTab(campaign: Pick<CampaignDto, 'status'>): CampaignTab {
    return campaign.status === 'ENDED' || campaign.status === 'ARCHIVED' ? 'past' : 'current';
}

// Live campaigns with dates or a discount first, then scheduled ones, then those with no dates.
function currentRank(campaign: CampaignDto): number {
    if (campaign.status === 'SCHEDULED') return 1;
    return campaign.startsAt === null && campaign.endsAt === null ? 2 : 0;
}

// When a past campaign stopped: archived, else ended. createdAt only as a last resort.
function pastTime(campaign: CampaignDto): number {
    return Date.parse(campaign.archivedAt ?? campaign.endsAt ?? campaign.createdAt);
}

export function campaignsForTab(items: readonly CampaignListItemDto[], tab: CampaignTab): CampaignListItemDto[] {
    const shown = items.filter((item) => campaignTab(item.campaign) === tab);
    if (tab === 'current') {
        return shown.sort((left, right) => currentRank(left.campaign) - currentRank(right.campaign) || right.current.visitors - left.current.visitors);
    }
    return shown.sort((left, right) => pastTime(right.campaign) - pastTime(left.campaign));
}

export type CampaignListRow = { item: CampaignListItemDto; verdict: Verdict | null; trend: Trend };

// The rows of a tab, each compared with every other campaign in the range, archived ones included.
export function campaignListRows(items: readonly CampaignListItemDto[], tab: CampaignTab): CampaignListRow[] {
    return campaignsForTab(items, tab).map((item) => ({
        item,
        verdict: verdictOf(
            item.current,
            items.filter((other) => other !== item).map((other) => other.current),
        ),
        trend: trendOf(item.daily),
    }));
}
