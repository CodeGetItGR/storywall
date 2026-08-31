import type { CheckoutResponseDto, OrderSummaryDto, PlanTierResponseDto } from '@/lib/api/types';

type PendingCheckout = {
    orderId: string;
    planTierCode?: string;
};

function pendingCheckoutKey(eventId: string): string {
    return `storywall.pendingCheckout.${eventId}`;
}

function checkoutSetupPromptKey(eventId: string): string {
    return `storywall.checkoutSetupPrompt.${eventId}`;
}

export function formatMoney(locale: string, minor: number, currency: string): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
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

export function rememberCheckoutSetupPrompt(eventId: string): void {
    if (typeof window === 'undefined') return;

    window.sessionStorage.setItem(checkoutSetupPromptKey(eventId), '1');
}

export function consumeCheckoutSetupPrompt(eventId: string): boolean {
    if (typeof window === 'undefined') return false;

    const key = checkoutSetupPromptKey(eventId);
    const shouldShow = window.sessionStorage.getItem(key) === '1';
    window.sessionStorage.removeItem(key);
    return shouldShow;
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
    return orders.filter((order) => order.status === 'PAID').reduce((sum, order) => sum + order.amountMinor, 0);
}

export function billingCurrency(orders: OrderSummaryDto[], fallback = 'EUR'): string {
    return orders.find((order) => order.status === 'PAID')?.currency ?? orders[0]?.currency ?? fallback;
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
