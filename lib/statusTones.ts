import type { AttendanceStatus, EventStatus, QrLinkStatus } from '@/lib/api/types';

export type RsvpDisplayStatus = AttendanceStatus | 'NO_RESPONSE';
export type QrDisplayStatus = QrLinkStatus;

export const eventStatusBadgeTone: Record<EventStatus, string> = {
    DRAFT: 'bg-amber-50 text-amber-700',
    ACTIVE: 'bg-primary-light text-primary-dark',
};

export const rsvpStatusOrder: Record<RsvpDisplayStatus, number> = {
    ATTENDING: 0,
    DECLINED: 1,
    NO_RESPONSE: 2,
};

export const rsvpStatusTone: Record<RsvpDisplayStatus, string> = {
    ATTENDING: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    DECLINED: 'bg-rose-50 text-rose-700 border-rose-100',
    NO_RESPONSE: 'bg-surface-muted text-ink-muted border-border',
};

export function getQrStatusTone(status: QrDisplayStatus): string {
    if (status === 'ACTIVE') return 'bg-primary-light text-primary-dark';
    if (status === 'EXPIRED') return 'bg-amber-50 text-amber-700';
    if (status === 'TARGET_UNAVAILABLE') return 'bg-sky-50 text-sky-700';
    return 'bg-rose-50 text-rose-700';
}
