import type { PartnerPortalTotalDto, PartnerTierProgressDto } from '@/lib/api/types';

export type PartnerBalance = { currency: string; earnedMinor: number; paidMinor: number; owedMinor: number };

// What the partner earned, was paid and is still owed, per currency.
export function partnerBalances(totals: PartnerPortalTotalDto[]): PartnerBalance[] {
    return totals.map((total) => ({
        currency: total.currency,
        earnedMinor: total.accruedMinor,
        paidMinor: total.paidMinor,
        owedMinor: total.accruedMinor - total.paidMinor,
    }));
}

// How far this year's activations are toward the next commission tier, from 0 to 1. Null at the top tier.
export function tierProgressRatio(progress: PartnerTierProgressDto): number | null {
    if (progress.nextTierMinActivations === null || progress.nextTierMinActivations <= 0) return null;
    return Math.min(1, progress.activationsThisYear / progress.nextTierMinActivations);
}
