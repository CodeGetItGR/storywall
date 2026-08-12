import { AlertTriangle, Bell, CreditCard, XCircle } from 'lucide-react';

import type { NotificationResponseDto } from '@/lib/api/types';
import { isBillingNotification, notificationSeverity } from '@/lib/notifications';

export const NOTIFICATION_SEVERITY_STYLES = {
    CRITICAL: 'text-rose-600 bg-rose-50',
    WARNING: 'text-amber-600 bg-amber-50',
    INFO: 'text-sky-600 bg-sky-50',
} as const;

export function NotificationSeverityIcon({ notification }: { notification: NotificationResponseDto }) {
    const severity = notificationSeverity(notification);
    if (!isBillingNotification(notification)) return <Bell className="h-2.5 w-2.5" strokeWidth={2} />;
    if (notification.type === 'REFUND_REJECTED') return <XCircle className="h-2.5 w-2.5" strokeWidth={2} />;
    if (severity === 'INFO') return <CreditCard className="h-2.5 w-2.5" strokeWidth={2} />;
    return <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />;
}
