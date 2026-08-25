'use client';

import { Bell, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { NotificationRow } from '@/components/notifications/NotificationRow';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { useMarkAllNotificationsRead, useNotifications, useUnreadNotificationCount } from '@/hooks/useNotifications';
import { isBillingNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

type CategoryFilter = 'all' | 'billing' | 'activity';

export default function NotificationsPage() {
    const t = useTranslations('NotificationsPage');
    const tError = useTranslations('PageErrorState.notifications');
    const notificationsQuery = useNotifications();
    const unreadCountQuery = useUnreadNotificationCount();
    const markAllRead = useMarkAllNotificationsRead();
    const [filter, setFilter] = useState<CategoryFilter>('all');

    const notifications = useMemo(() => notificationsQuery.data?.pages.flatMap((page) => page.content) ?? [], [notificationsQuery.data?.pages]);
    const loadMoreRef = useInfiniteScrollSentinel(notificationsQuery.hasNextPage, notificationsQuery.fetchNextPage, notifications.length);
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

    if (notificationsQuery.error) {
        return <PageErrorState title={tError('title')} description={tError('description')} onRetryAction={notificationsQuery.refetch} />;
    }

    return (
        <div className="mx-auto max-w-2xl pb-24 lg:pb-8">
            <div className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-ink">{t('title')}</h1>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white tabular-nums">{unreadCount}</span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={markAllRead.isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                            {markAllRead.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            {t('markAllRead')}
                        </button>
                    )}
                </div>
                <div className="mt-3 flex gap-2">
                    {filters.map((key) => (
                        <button
                            type="button"
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
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
                        <Bell className="h-7 w-7 text-ink-faint" />
                    </div>
                    <p className="text-sm font-medium text-ink-muted">{t('emptyState.title')}</p>
                    <p className="mt-1 text-xs text-ink-faint">{t('emptyState.description')}</p>
                </div>
            ) : (
                <div>
                    {unread.length > 0 && (
                        <section>
                            <p className="px-4 pt-5 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase">{t('sections.new')}</p>
                            {unread.map((notification) => (
                                <NotificationRow key={notification.id} notification={notification} />
                            ))}
                        </section>
                    )}
                    {earlier.length > 0 && (
                        <section>
                            <p className="px-4 pt-5 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase">{t('sections.earlier')}</p>
                            {earlier.map((notification) => (
                                <NotificationRow key={notification.id} notification={notification} />
                            ))}
                        </section>
                    )}
                    <div ref={loadMoreRef} className="h-1" />
                    {notificationsQuery.isFetchingNextPage && <p className="py-4 text-center text-sm text-ink-muted">{t('loadingMore')}</p>}
                </div>
            )}
        </div>
    );
}
