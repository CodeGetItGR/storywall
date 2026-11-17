import { formatEventDateParts } from '@/lib/datetime';
import { formatBytes } from '@/lib/format';

type Money = { amountMinor: number; currency: string | null };

// What the host pays at activation: the code's price when one is applied, else the plan's, else nothing.
export function dueAtActivation(
    activation: { amountMinor: number; currency: string | null } | null,
    codePreview: { payableAmountMinor: number; currency: string } | null,
    planCurrency: string | null,
): Money {
    if (codePreview) return { amountMinor: codePreview.payableAmountMinor, currency: codePreview.currency };
    if (activation) return { amountMinor: activation.amountMinor, currency: activation.currency };
    return { amountMinor: 0, currency: planCurrency };
}

// The details form keeps the start as typed ("2027-06-12T18:00", the event's wall clock), so it is
// shown without converting time zones.
export function previewWhen(locale: string, startAt: string): string {
    if (!startAt) return '';
    const parts = formatEventDateParts(locale, startAt, null);
    return parts ? joinLine([parts.date, parts.time]) : '';
}

export function joinLine(parts: (string | null | undefined)[]): string {
    return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

type PlanRowCopy = { guestsUpTo: (count: number) => string; guestsUnlimited: string; storageUnlimited: string };

// The review's plan row, second line: "Up to 300 guests · 25 GB".
export function planRowDetail(plan: { maxMembers: number | null; storageBytes: number | null }, copy: PlanRowCopy): string {
    const guests = plan.maxMembers === null ? copy.guestsUnlimited : copy.guestsUpTo(plan.maxMembers);
    const storage = plan.storageBytes === null ? copy.storageUnlimited : formatBytes(plan.storageBytes);
    return joinLine([guests, storage]);
}
