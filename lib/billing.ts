import type { OrderSummaryDto } from '@/lib/api/types';

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
