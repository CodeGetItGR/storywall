'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { CostTrafficCopyAction } from '@/components/admin/CostTrafficCopyAction';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Page } from '@/lib/api/pagination';
import type { CalendarDaySummaryDto, EventDashboardRowDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { formatBytes, formatCount } from '@/lib/format';

export function CostTrackingDayDrawer({
    day,
    error,
    events,
    isLoading,
    onCloseAction,
    onPageChangeAction,
    open,
    page,
}: {
    day: CalendarDaySummaryDto | undefined;
    error: unknown;
    events: Page<EventDashboardRowDto> | undefined;
    isLoading: boolean;
    onCloseAction: () => void;
    onPageChangeAction: (page: number) => void;
    open: boolean;
    page: number;
}) {
    const locale = useLocale();
    const t = useTranslations('AdminPage.costTracking.calendar');
    const trafficT = useTranslations('AdminPage.costTracking.traffic');
    const title = day
        ? formatDate(locale, day.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        : t('dayDetails');

    function handlePageClick(event: MouseEvent<HTMLButtonElement>) {
        const nextPage = Number(event.currentTarget.dataset.page);
        if (Number.isInteger(nextPage) && nextPage >= 0) onPageChangeAction(nextPage);
    }

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            title={title}
            subtitle={day ? t('drawerSubtitle', { count: day.eventCount }) : undefined}
            closeLabel={t('closeDrawer')}
        >
            {/* Day event list */}
            {isLoading ? (
                <LoadingState label={t('drawerLoading')} className="justify-start py-6" />
            ) : error ? (
                <p className="text-sm text-status-danger">{t('drawerError')}</p>
            ) : !events || events.content.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('drawerEmpty')}</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-surface-muted/70 text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                            <tr>
                                <th className="px-3 py-2.5 font-bold">{trafficT('columns.eventType')}</th>
                                <th className="px-3 py-2.5 font-bold">{trafficT('columns.plan')}</th>
                                <th className="px-3 py-2.5 font-bold">{trafficT('columns.storage')}</th>
                                <th className="w-10 px-2 py-2.5">
                                    <span className="sr-only">{trafficT('columns.eventId')}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.content.map((event) => (
                                <tr key={event.eventId} className="border-t border-border text-ink last:border-b-0">
                                    <td className="px-3 py-3 font-semibold">{event.eventType}</td>
                                    <td className="px-3 py-3 font-mono text-xs font-bold">{event.planTierCode}</td>
                                    <td className="px-3 py-3 font-mono text-xs text-ink-muted tabular-nums">
                                        {event.storageQuotaBytes === null ? trafficT('unlimited') : formatBytes(event.storageQuotaBytes)}
                                        <span className="block pt-0.5 text-[10px] text-ink-faint">
                                            {trafficT('guestsValue', {
                                                value: event.guestQuotaMax === null ? trafficT('unlimited') : formatCount(event.guestQuotaMax),
                                            })}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        <CostTrafficCopyAction eventId={event.eventId} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Day pagination */}
                    {events.page.totalPages > 1 && (
                        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
                            <p className="text-xs text-ink-muted">
                                {trafficT('pageStatus', {
                                    page: events.page.number + 1,
                                    total: events.page.totalPages,
                                    count: events.page.totalElements,
                                })}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    data-page={page - 1}
                                    disabled={page === 0}
                                    onClick={handlePageClick}
                                    aria-label={trafficT('previous')}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    data-page={page + 1}
                                    disabled={page + 1 >= events.page.totalPages}
                                    onClick={handlePageClick}
                                    aria-label={trafficT('next')}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AdminDrawer>
    );
}
