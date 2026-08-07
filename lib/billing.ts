import type { OrderSummaryDto } from '@/lib/api/types';

export function formatMoney(locale: string, minor: number, currency: string): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
}

export function formatBillingDate(locale: string, value: string | null): string | null {
    return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : null;
}

export function checkoutSuccessUrl(origin: string, eventId: string, orderId: string): string {
    return `${origin}/events/${eventId}/checkout/success?orderId=${encodeURIComponent(orderId)}`;
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
