import type { BillingNotificationType, NotificationCtaTarget, NotificationResponseDto, NotificationSeverity } from '@/lib/api/types';

// ctaTarget is a closed, growable set (notification-cta-target-fe-integration.md) — an
// unrecognized target hides the CTA rather than crashing or navigating nowhere.
const CTA_ROUTES: Record<NotificationCtaTarget, (params: Record<string, string>) => string> = {
    EVENT_PLAN_SETTINGS: (p) => `/events/${p.eventId}/settings/plan`,
    EVENT_GALLERY: (p) => `/events/${p.eventId}/gallery`,
    EVENT_GUESTS: (p) => `/events/${p.eventId}/guests`,
    EVENT_COVERAGE_EXTEND: (p) => `/events/${p.eventId}/settings/plan?extend=1`,
};

export function notificationCtaRoute(notification: NotificationResponseDto): string | null {
    if (!notification.ctaTarget) return null;
    const build = CTA_ROUTES[notification.ctaTarget];
    return build ? build(notification.ctaParams ?? {}) : null;
}

const BILLING_TYPES: readonly string[] = [
    'WITHDRAWAL_REFUNDED',
    'WITHDRAWAL_HELD',
    'WITHDRAWAL_WITHHELD',
    'STORAGE_TRIM_SCHEDULED',
    'STORAGE_TRIM_WARNING',
] satisfies readonly BillingNotificationType[];

// A WITHDRAWAL_REFUNDED for one order leaves the event in place, so it must not
// read as "the event was deleted".
function isOrderScoped(notification: NotificationResponseDto): boolean {
    return notification.payload?.scope === 'ORDER';
}

// The message key under NotificationsPage.types that holds this notification's fallback copy.
export function notificationCopyType(notification: NotificationResponseDto): string {
    if (notification.type === 'WITHDRAWAL_REFUNDED' && isOrderScoped(notification)) return 'WITHDRAWAL_REFUNDED_ORDER';
    return notification.type;
}

export function isBillingNotification(notification: NotificationResponseDto): boolean {
    return notification.category === 'BILLING' || BILLING_TYPES.includes(notification.type);
}

export function isBillingNotificationType(type: string): type is BillingNotificationType {
    return BILLING_TYPES.includes(type);
}

export function notificationSeverity(notification: NotificationResponseDto): NotificationSeverity {
    if (notification.severity) return notification.severity;
    // Both report the event disappearing/the host losing standing — give them the
    // same weight the old REFUND_APPROVED had. WITHDRAWAL_HELD changes nothing yet,
    // so it stays INFO via the fallback below.
    if (notification.type === 'WITHDRAWAL_REFUNDED' && isOrderScoped(notification)) return 'INFO';
    if (notification.type === 'WITHDRAWAL_REFUNDED' || notification.type === 'WITHDRAWAL_WITHHELD') return 'CRITICAL';
    if (notification.type === 'STORAGE_TRIM_WARNING') return 'CRITICAL';
    if (notification.type === 'STORAGE_TRIM_SCHEDULED') return 'WARNING';
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
