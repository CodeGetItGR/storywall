'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { EventStatePill } from '@/components/admin/events/EventStatePill';
import { useAdminEvents } from '@/hooks/useAdminEvents';
import { adminEventState, EMPTY_EVENT_FILTERS, formatEventsHash } from '@/lib/adminEvents';
import { formatAdminDate } from '@/lib/adminOrders';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { UserResponseDto } from '@/lib/api/types';

const PREVIEW_SIZE = 5;

// The events this account hosts, newest first: a few here, each opening its page, and the rest in Events.
export function AccountEventsSection({ account, hostLabel }: { account: UserResponseDto; hostLabel: string }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const { sendTo } = useAdminNavigation();
    const eventsQuery = useAdminEvents({ filters: { ...EMPTY_EVENT_FILTERS, hostUserId: account.id }, page: 0, size: PREVIEW_SIZE });
    const events = eventsQuery.data?.content ?? [];
    const total = eventsQuery.data?.page.totalElements ?? 0;

    function openAll() {
        sendTo('events', { hostUserId: account.id, hostLabel });
    }

    return (
        <section aria-labelledby="account-events-heading" className="border-t border-border pt-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 id="account-events-heading" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('accounts.events.title')}
                </h3>
                {total > PREVIEW_SIZE && (
                    <button
                        type="button"
                        onClick={openAll}
                        className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                    >
                        {t('accounts.events.viewAll', { count: total })}
                    </button>
                )}
            </div>

            {/* Events */}
            {eventsQuery.isLoading && <p className="mt-3 text-sm text-ink-muted">{t('events.loading')}</p>}
            {Boolean(eventsQuery.error) && <p className="mt-3 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(eventsQuery.error)}`)}</p>}
            {eventsQuery.data && events.length === 0 && <p className="mt-3 text-sm text-ink-muted">{t('accounts.events.empty')}</p>}
            {events.length > 0 && (
                <ul className="mt-2 divide-y divide-border">
                    {events.map((event) => (
                        <li key={event.id}>
                            <a href={formatEventsHash(event.id)} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-canvas">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">{event.title ?? t('events.untitled')}</span>
                                    <span className="block font-mono text-[11px] text-ink-faint">
                                        {event.planCode ?? t('events.plan.none')}
                                        {event.startAt && ` · ${formatAdminDate(locale, event.startAt)}`}
                                    </span>
                                </span>
                                <EventStatePill state={adminEventState(event)} />
                                <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-ink-muted" aria-hidden />
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
