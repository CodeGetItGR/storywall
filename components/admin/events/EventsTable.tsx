'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { EventStatePill } from '@/components/admin/events/EventStatePill';
import { adminEventState, formatEventsHash } from '@/lib/adminEvents';
import { formatAdminDate } from '@/lib/adminOrders';
import type { AdminEventSummaryDto } from '@/lib/api/types';

export function EventsTable({ events }: { events: AdminEventSummaryDto[] }) {
    const t = useTranslations('AdminPage.events');
    const locale = useLocale();

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.event')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.host')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.plan')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.dates')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.created')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.state')}</th>
                        <th className="px-3 py-3" />
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => {
                        const title = event.title ?? t('untitled');
                        const host = event.primaryHost;
                        return (
                            <tr key={event.id} className="relative border-b border-border last:border-b-0 hover:bg-canvas/55">
                                {/* Event: the link covers the whole row */}
                                <td className="max-w-72 px-5 py-3">
                                    <a
                                        href={formatEventsHash(event.id)}
                                        aria-label={t('openEvent', { event: title })}
                                        className="block truncate font-semibold text-ink after:absolute after:inset-0"
                                    >
                                        {title}
                                    </a>
                                    <span className="block font-mono text-[11px] text-ink-faint">{event.eventType}</span>
                                </td>

                                {/* Host */}
                                <td className="max-w-64 px-3 py-3">
                                    <span className="block truncate text-ink">{host?.displayName ?? host?.email ?? t('noHost')}</span>
                                    {host?.displayName && host.email && <span className="block truncate text-xs text-ink-faint">{host.email}</span>}
                                </td>

                                {/* Plan */}
                                <td className="px-3 py-3 font-mono text-xs text-ink-muted">{event.planCode ?? t('noValue')}</td>

                                {/* Event date */}
                                <td className="px-3 py-3 font-mono text-[12px] whitespace-nowrap text-ink-muted">
                                    {event.startAt ? formatAdminDate(locale, event.startAt) : t('noValue')}
                                </td>

                                {/* Created */}
                                <td className="px-3 py-3 font-mono text-[12px] whitespace-nowrap text-ink-muted">{formatAdminDate(locale, event.createdAt)}</td>

                                {/* State */}
                                <td className="px-3 py-3">
                                    <EventStatePill state={adminEventState(event)} />
                                </td>

                                {/* Open */}
                                <td className="px-3 py-3 text-ink-faint">
                                    <ChevronRight className="h-4 w-4" aria-hidden />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
