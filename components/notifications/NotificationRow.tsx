'use client';

import { ChevronRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback } from 'react';

import { NOTIFICATION_SEVERITY_STYLES, NotificationSeverityIcon } from '@/components/notifications/NotificationSeverityIcon';
import { useDeleteNotification, useMarkNotificationRead } from '@/hooks/useNotifications';
import type { NotificationResponseDto } from '@/lib/api/types';
import { notificationCtaRoute, notificationSeverity, payloadString } from '@/lib/notifications';
import { cn, timeAgoParts } from '@/lib/utils';

export function NotificationRow({ notification }: { notification: NotificationResponseDto }) {
    const t = useTranslations('NotificationsPage');
    const markRead = useMarkNotificationRead();
    const deleteNotification = useDeleteNotification();

    const isRead = Boolean(notification.readAt);
    const ctaRoute = notificationCtaRoute(notification);
    const severity = notificationSeverity(notification);

    const handleActivate = useCallback(() => {
        if (!isRead) markRead.mutate(notification.id);
    }, [isRead, markRead, notification.id]);

    const handleDelete = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            deleteNotification.mutate(notification.id);
        },
        [deleteNotification, notification.id]
    );

    const titleKey = `types.${notification.type}.title`;
    const bodyKey = `types.${notification.type}.body`;
    const title = notification.title ?? (t.has(titleKey) ? t(titleKey) : t('generic.title'));
    const body =
        notification.body ??
        (t.has(bodyKey)
            ? t(bodyKey, {
                  days: payloadString(notification, 'daysRemaining') ?? payloadString(notification, 'daysOverdue') ?? '0',
                  daysUntilFreeze: payloadString(notification, 'daysUntilFreeze') ?? '0',
                  plan: payloadString(notification, 'planTier') ?? '',
              })
            : null);

    const decisionNote = payloadString(notification, 'decisionNote');
    const timeAgo = timeAgoParts(notification.createdAt);

    const content = (
        <>
            <div className="relative shrink-0">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', NOTIFICATION_SEVERITY_STYLES[severity])}>
                    <NotificationSeverityIcon notification={notification} />
                </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
                <p className={cn('text-sm leading-snug', isRead ? 'text-ink-muted' : 'font-medium text-ink')}>{title}</p>
                {body && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{body}</p>}
                {decisionNote && <p className="mt-1 text-xs leading-relaxed text-ink-faint italic">{decisionNote}</p>}
                <p className="mt-1 text-xs text-ink-faint">
                    {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                </p>
                {ctaRoute && notification.ctaLabel && (
                    <p className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                        {notification.ctaLabel}
                        <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                    </p>
                )}
            </div>

            {!isRead && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
        </>
    );

    const rowClass = cn(
        'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted',
        !isRead && 'bg-primary-light/40'
    );

    return (
        <div className="group relative">
            {ctaRoute ? (
                <Link href={ctaRoute} onClick={handleActivate} className={rowClass}>
                    {content}
                </Link>
            ) : (
                <button type="button" onClick={handleActivate} className={rowClass}>
                    {content}
                </button>
            )}
            <button
                type="button"
                onClick={handleDelete}
                disabled={deleteNotification.isPending}
                aria-label={t('delete')}
                className="absolute top-3 right-3 hidden rounded-full p-1.5 text-ink-faint transition hover:bg-background hover:text-ink group-hover:block disabled:opacity-50"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
