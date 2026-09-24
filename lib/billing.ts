import type { CheckoutResponseDto, EventStatus, OrderSummaryDto, PlanTierResponseDto } from '@/lib/api/types';

type PendingCheckout = {
    orderId: string;
    planTierCode?: string;
};

function pendingCheckoutKey(eventId: string): string {
    return `storywall.pendingCheckout.${eventId}`;
}

export function formatMoney(locale: string, minor: number, currency: string | null): string {
    return formatOptionalMoney(minor, currency, locale) ?? '0.00';
}

export function formatOptionalMoney(minor: number | null, currency: string | null, locale?: string): string | null {
    if (minor === null) return null;

    const value = minor / 100;
    if (!currency) return value.toFixed(2);

    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currency}`;
    }
}

// windowClosesAt is the first instant withdrawal is no longer possible, so the
// last moment a host can still withdraw is one second before it.
export function lastWithdrawalMoment(windowClosesAt: string): Date {
    return new Date(new Date(windowClosesAt).getTime() - 1000);
}

export function formatBillingDate(locale: string, value: string | null): string | null {
    return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : null;
}

export function checkoutSuccessUrl(origin: string, eventId: string, orderId: string, planTierCode?: string | null): string {
    const params = new URLSearchParams({ orderId });
    if (planTierCode) params.set('planTierCode', planTierCode);
    return `${origin}/events/${eventId}/checkout/success?${params.toString()}`;
}

export function rememberPendingCheckout(eventId: string, orderId: string, planTierCode?: string | null): void {
    if (typeof window === 'undefined') return;

    const pending: PendingCheckout = { orderId };
    if (planTierCode) pending.planTierCode = planTierCode;
    window.sessionStorage.setItem(pendingCheckoutKey(eventId), JSON.stringify(pending));
}

export function readPendingCheckout(eventId: string): PendingCheckout | null {
    if (typeof window === 'undefined') return null;

    const value = window.sessionStorage.getItem(pendingCheckoutKey(eventId));
    if (!value) return null;

    try {
        const pending = JSON.parse(value) as Partial<PendingCheckout>;
        return typeof pending.orderId === 'string'
            ? { orderId: pending.orderId, ...(typeof pending.planTierCode === 'string' ? { planTierCode: pending.planTierCode } : {}) }
            : null;
    } catch {
        return null;
    }
}

export function clearPendingCheckout(eventId: string): void {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(pendingCheckoutKey(eventId));
}

export function navigateToCheckout(eventId: string, checkout: CheckoutResponseDto, planTierCode?: string | null): void {
    rememberPendingCheckout(eventId, checkout.orderId, planTierCode);
    const destination = checkout.redirectUrl.includes('/checkout/success')
        ? checkoutSuccessUrl(window.location.origin, eventId, checkout.orderId, planTierCode)
        : checkout.redirectUrl;
    window.location.assign(destination);
}

export function newestBillingOrder(orders: OrderSummaryDto[], kind?: OrderSummaryDto['kind']): OrderSummaryDto | null {
    const scoped = kind ? orders.filter((order) => order.kind === kind) : orders;
    return [...scoped].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
}

export function paidBillingTotal(orders: OrderSummaryDto[]): number {
    return orders.filter((order) => order.status === 'PAID').reduce((sum, order) => sum + (order.amountMinor ?? 0), 0);
}

export function billingCurrency(orders: OrderSummaryDto[], fallback = 'EUR'): string {
    return (
        orders.find((order) => order.status === 'PAID' && order.currency)?.currency ?? orders.find((order) => order.currency)?.currency ?? fallback
    );
}

export function isPlanDiscountActive(plan: PlanTierResponseDto, now = new Date()): boolean {
    if (!plan.discountPercent || plan.discountPercent <= 0) return false;

    const startsAt = parseDiscountBoundary(plan.discountStartsAt);
    if (startsAt && startsAt.getTime() > now.getTime()) return false;

    const endsAt = parseDiscountBoundary(plan.discountEndsAt);
    if (endsAt && endsAt.getTime() <= now.getTime()) return false;

    return true;
}

export function discountedAmountMinor(amountMinor: number, plan: PlanTierResponseDto, now = new Date()): number {
    if (!isPlanDiscountActive(plan, now)) return amountMinor;

    const discountPercent = Math.min(Math.max(plan.discountPercent ?? 0, 0), 100);
    return Math.max(0, Math.round(amountMinor * (1 - discountPercent / 100)));
}

function parseDiscountBoundary(value: string | null): Date | null {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

// The billing section `?section=` targets for the coverage-ending notification's CTA.
export const EXTEND_COVERAGE_SECTION_ID = 'extend-coverage';

// Only the main host of a live event whose coverage has not ended can buy more
// months (coverage-options-and-extensions-fe-integration.md §11). Whether the plan
// sells any extension is the server's answer, checked separately.
export function canExtendCoverage({
    isPrimaryHost,
    eventStatus,
    coverageEndsAt,
    now = new Date(),
}: {
    isPrimaryHost: boolean;
    eventStatus: EventStatus | null;
    coverageEndsAt: string | null;
    now?: Date;
}): boolean {
    if (!isPrimaryHost || eventStatus !== 'ACTIVE' || !coverageEndsAt) return false;
    return new Date(coverageEndsAt).getTime() > now.getTime();
}
