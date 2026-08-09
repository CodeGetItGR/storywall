import type { BillingNotificationType, NotificationResponseDto, NotificationSeverity } from '@/lib/api/types';

// Billing notifications carry their own CTA target (billing-fe-guide §10) —
// always `/events/{eventId}/settings/plan` today, but read it off the payload
// rather than rebuilding it so a server-side change does not strand the link.
export function notificationCtaRoute(notification: NotificationResponseDto): string | null {
    if (notification.ctaRoute?.startsWith('/')) return notification.ctaRoute;
    const route = notification.payload?.ctaRoute;
    return typeof route === 'string' && route.startsWith('/') ? route : null;
}

const BILLING_TYPES: readonly string[] = [
    'BILLING_EXPIRING',
    'BILLING_PAST_DUE',
    'BILLING_PURGE_WARNING',
    'REFUND_APPROVED',
    'REFUND_REJECTED',
] satisfies readonly BillingNotificationType[];

export function isBillingNotification(notification: NotificationResponseDto): boolean {
    return notification.category === 'BILLING' || BILLING_TYPES.includes(notification.type);
}

export function isBillingNotificationType(type: string): type is BillingNotificationType {
    return BILLING_TYPES.includes(type);
}

export function notificationSeverity(notification: NotificationResponseDto): NotificationSeverity {
    if (notification.severity) return notification.severity;
    if (notification.type === 'BILLING_PAST_DUE' || notification.type === 'BILLING_PURGE_WARNING' || notification.type === 'REFUND_APPROVED') {
        return 'CRITICAL';
    }
    if (notification.type === 'BILLING_EXPIRING') return 'WARNING';
    return 'INFO';
}

// Payload numbers/dates are precomputed server-side and rendered as-is so the
// in-app copy matches the email the host already received.
export function payloadString(notification: NotificationResponseDto, key: string): string | null {
    const value = notification.payload?.[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return null;
}

export function payloadNumber(notification: NotificationResponseDto, key: string): number | null {
    const value = notification.payload?.[key];
    return typeof value === 'number' ? value : null;
}

export function payloadBoolean(notification: NotificationResponseDto, key: string): boolean | null {
    const value = notification.payload?.[key];
    return typeof value === 'boolean' ? value : null;
}
