'use client';

import { AlertTriangle, Bell, CreditCard, Loader2, Trash2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import {
    useDeleteNotification,
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
    useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import type { NotificationResponseDto } from '@/lib/api/types';
import { isBillingNotification, notificationCtaRoute, notificationSeverity, payloadString } from '@/lib/notifications';
import { cn, timeAgoParts } from '@/lib/utils';

type CategoryFilter = 'all' | 'billing' | 'activity';

const SEVERITY_STYLES = {
    CRITICAL: 'text-rose-600 bg-rose-50',
    WARNING: 'text-amber-600 bg-amber-50',
    INFO: 'text-sky-600 bg-sky-50',
} as const;

function SeverityIcon({ notification }: { notification: NotificationResponseDto }) {
    const severity = notificationSeverity(notification);
    if (!isBillingNotification(notification)) return <Bell className="w-2.5 h-2.5" strokeWidth={2} />;
    if (notification.type === 'REFUND_REJECTED') return <XCircle className="w-2.5 h-2.5" strokeWidth={2} />;
    if (severity === 'INFO') return <CreditCard className="w-2.5 h-2.5" strokeWidth={2} />;
    return <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2} />;
}

export default function NotificationsPage() {
    const t = useTranslations('NotificationsPage');
    const notificationsQuery = useNotifications();
    const unreadCountQuery = useUnreadNotificationCount();
    const markAllRead = useMarkAllNotificationsRead();
    const [filter, setFilter] = useState<CategoryFilter>('all');

    const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
    const visible = useMemo(() => {
        if (filter === 'billing') return notifications.filter(isBillingNotification);
        if (filter === 'activity') return notifications.filter((notification) => !isBillingNotification(notification));
        return notifications;
    }, [notifications, filter]);

    const unreadCount = unreadCountQuery.data ?? notifications.filter((notification) => !notification.readAt).length;
    const unread = visible.filter((notification) => !notification.readAt);
    const earlier = visible.filter((notification) => notification.readAt);

    const handleMarkAllRead = useCallback(() => {
        markAllRead.mutate();
    }, [markAllRead]);

    const handleFilterClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const next = event.currentTarget.dataset.filter as CategoryFilter | undefined;
        if (next) setFilter(next);
    }, []);

    const filters: CategoryFilter[] = ['all', 'billing', 'activity'];

    return (
        <div className="max-w-2xl mx-auto pb-24 lg:pb-8">
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-ink">{t('title')}</h1>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold tabular-nums">{unreadCount}</span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markAllRead.isPending}
                            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                        >
                            {markAllRead.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            {t('markAllRead')}
                        </button>
                    )}
                </div>
                <div className="mt-3 flex gap-2">
                    {filters.map((key) => (
                        <button
                            key={key}
                            data-filter={key}
                            onClick={handleFilterClick}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold transition',
                                filter === key ? 'bg-ink text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
                            )}
                        >
                            {t(`filters.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {notificationsQuery.isLoading ? (
                <div className="space-y-2 px-4 py-6">
                    <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
                </div>
            ) : notificationsQuery.error ? (
                <p className="px-4 py-10 text-center text-sm text-rose-600">{t('loadError')}</p>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-4">
                        <Bell className="w-7 h-7 text-ink-faint" />
                    </div>
                    <p className="text-sm font-medium text-ink-muted">{t('emptyState.title')}</p>
                    <p className="text-xs text-ink-faint mt-1">{t('emptyState.description')}</p>
                </div>
            ) : (
                <div>
                    {unread.length > 0 && (
                        <section>
                            <p className="px-4 pt-5 pb-2 text-xs font-bold text-ink-muted uppercase tracking-wide">{t('sections.new')}</p>
                            {unread.map((notification) => (
                                <NotifRow key={notification.id} notification={notification} />
                            ))}
                        </section>
                    )}
                    {earlier.length > 0 && (
                        <section>
                            <p className="px-4 pt-5 pb-2 text-xs font-bold text-ink-muted uppercase tracking-wide">{t('sections.earlier')}</p>
                            {earlier.map((notification) => (
                                <NotifRow key={notification.id} notification={notification} />
                            ))}
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

function NotifRow({ notification }: { notification: NotificationResponseDto }) {
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

    // Unknown types are expected — the server adds notification types without a
    // frontend deploy, so anything without copy falls back to a generic row.
    const titleKey = `types.${notification.type}.title`;
    const bodyKey = `types.${notification.type}.body`;
    const title = notification.title ?? (t.has(titleKey) ? t(titleKey) : t('generic.title'));
    const body = notification.body ?? (t.has(bodyKey)
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
            <div className="relative flex-shrink-0">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', SEVERITY_STYLES[severity])}>
                    <SeverityIcon notification={notification} />
                </div>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
                <p className={cn('text-sm leading-snug', isRead ? 'text-ink-muted' : 'text-ink font-medium')}>{title}</p>
                {body && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{body}</p>}
                {decisionNote && <p className="mt-1 text-xs italic leading-relaxed text-ink-faint">{decisionNote}</p>}
                <p className="text-xs text-ink-faint mt-1">{timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}</p>
            </div>

            {!isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-hidden="true" />}
        </>
    );

    const rowClass = cn('w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted', !isRead && 'bg-primary-light/40');

    return (
        <div className="relative group">
            {ctaRoute ? (
                <Link href={ctaRoute} onClick={handleActivate} className={rowClass}>
                    {content}
                </Link>
            ) : (
                <button onClick={handleActivate} className={rowClass}>
                    {content}
                </button>
            )}
            <button
                onClick={handleDelete}
                disabled={deleteNotification.isPending}
                aria-label={t('delete')}
                className="absolute right-3 top-3 hidden rounded-full p-1.5 text-ink-faint transition hover:bg-background hover:text-ink group-hover:block disabled:opacity-50"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
