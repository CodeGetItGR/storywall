import type { BillingNotificationType, NotificationCtaTarget, NotificationResponseDto, NotificationSeverity } from '@/lib/api/types';

// ctaTarget is a closed, growable set (notification-cta-target-fe-integration.md) — an
// unrecognized target hides the CTA rather than crashing or navigating nowhere.
const CTA_ROUTES: Record<NotificationCtaTarget, (params: Record<string, string>) => string> = {
    EVENT_PLAN_SETTINGS: (p) => `/events/${p.eventId}/settings/plan`,
    EVENT_GALLERY: (p) => `/events/${p.eventId}/gallery`,
    EVENT_GUESTS: (p) => `/events/${p.eventId}/guests`,
};

export function notificationCtaRoute(notification: NotificationResponseDto): string | null {
    if (!notification.ctaTarget) return null;
    const build = CTA_ROUTES[notification.ctaTarget];
    return build ? build(notification.ctaParams ?? {}) : null;
}

const BILLING_TYPES: readonly string[] = ['REFUND_APPROVED', 'REFUND_REJECTED'] satisfies readonly BillingNotificationType[];

export function isBillingNotification(notification: NotificationResponseDto): boolean {
    return notification.category === 'BILLING' || BILLING_TYPES.includes(notification.type);
}

export function isBillingNotificationType(type: string): type is BillingNotificationType {
    return BILLING_TYPES.includes(type);
}

export function notificationSeverity(notification: NotificationResponseDto): NotificationSeverity {
    if (notification.severity) return notification.severity;
    if (notification.type === 'REFUND_APPROVED') return 'CRITICAL';
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
