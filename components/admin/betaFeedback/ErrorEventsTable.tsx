'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { ErrorSourcePill } from '@/components/admin/betaFeedback/ErrorSourcePill';
import { firstLine } from '@/lib/adminBetaFeedback';
import type { ErrorEventResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function ErrorEventsTable({
    events,
    onOpenAction,
}: {
    events: ErrorEventResponseDto[];
    onOpenAction: (event: ErrorEventResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.errorEvents');
    const locale = useLocale();

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const row = events.find((item) => item.id === event.currentTarget.dataset.eventId);
        if (row) onOpenAction(row);
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.lastSeen')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.source')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.error')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.count')}</th>
                        <th className="px-5 py-3 font-bold">{t('columns.ref')}</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => (
                        <tr key={event.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">
                                {formatDate(locale, event.lastSeenAt, DATE_FORMAT)}
                            </td>
                            <td className="px-3 py-3.5">
                                <ErrorSourcePill source={event.source} />
                            </td>
                            <td className="px-3 py-3.5">
                                <button
                                    type="button"
                                    data-event-id={event.id}
                                    onClick={handleOpen}
                                    aria-label={t('open')}
                                    className="block max-w-lg text-left hover:underline"
                                >
                                    <span className="block truncate font-mono text-xs font-semibold text-ink">{event.errorType}</span>
                                    {event.message ? <span className="block truncate text-xs text-ink-muted">{firstLine(event.message)}</span> : null}
                                </button>
                            </td>
                            <td className="px-3 py-3.5 text-right font-mono text-xs text-ink">{event.occurrenceCount}</td>
                            <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">{event.ref}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
