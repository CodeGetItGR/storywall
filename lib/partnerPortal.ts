import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { PartnerPortalTotalDto, PartnerTierProgressDto } from '@/lib/api/types';

export type PartnerPortalBlock = 'notVerified' | 'notLinked';

// Why the partner page refused this account, or null when it failed for another reason.
export function partnerPortalBlock(error: unknown): PartnerPortalBlock | null {
    const code = getErrorCode(error);
    if (code === ERROR_CODES.PARTNER_EMAIL_NOT_VERIFIED) return 'notVerified';
    if (code === ERROR_CODES.PARTNER_NOT_LINKED) return 'notLinked';
    return null;
}

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
