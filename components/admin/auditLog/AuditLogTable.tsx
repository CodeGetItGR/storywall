'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AuditActionPill } from '@/components/admin/auditLog/AuditActionPill';
import type { AuditAdminFilter } from '@/hooks/useAdminAuditLog';
import { useAuditSummaryText } from '@/hooks/useAuditSummaryText';
import { auditAdminLabel, auditReason } from '@/lib/adminAuditLog';
import type { AdminAuditLogResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

// One row per admin action, newest first. The admin and the event filter the log; the details open the drawer.
export function AuditLogTable({
    entries,
    onOpenAction,
    onAdminAction,
    onEventAction,
}: {
    entries: AdminAuditLogResponseDto[];
    onOpenAction: (entry: AdminAuditLogResponseDto) => void;
    onAdminAction: (admin: AuditAdminFilter) => void;
    onEventAction: (eventId: string) => void;
}) {
    const t = useTranslations('AdminPage.auditLog');
    const locale = useLocale();
    const summaryText = useAuditSummaryText();

    function find(event: MouseEvent<HTMLButtonElement>) {
        return entries.find((item) => item.id === event.currentTarget.dataset.entryId);
    }

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const entry = find(event);
        if (entry) onOpenAction(entry);
    }

    function handleAdmin(event: MouseEvent<HTMLButtonElement>) {
        const entry = find(event);
        if (entry) onAdminAction({ id: entry.adminUserId, label: auditAdminLabel(entry) });
    }

    function handleEvent(event: MouseEvent<HTMLButtonElement>) {
        const entry = find(event);
        if (entry?.eventId) onEventAction(entry.eventId);
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.when')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.admin')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.action')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.details')}</th>
                        <th className="px-5 py-3 font-bold">{t('columns.event')}</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => {
                        const summary = summaryText(entry);
                        const reason = auditReason(entry.details);
                        return (
                            <tr key={entry.id} className="border-b border-border align-top last:border-b-0 hover:bg-canvas/55">
                                {/* When */}
                                <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">{formatDate(locale, entry.createdAt, DATE_FORMAT)}</td>

                                {/* Admin */}
                                <td className="px-3 py-3.5">
                                    <button
                                        type="button"
                                        data-entry-id={entry.id}
                                        onClick={handleAdmin}
                                        title={t('filterByAdmin')}
                                        className="max-w-44 truncate text-left text-xs font-semibold text-ink hover:underline"
                                    >
                                        {auditAdminLabel(entry)}
                                    </button>
                                </td>

                                {/* Action */}
                                <td className="px-3 py-3.5">
                                    <AuditActionPill action={entry.action} />
                                </td>

                                {/* Details */}
                                <td className="px-3 py-3.5">
                                    <button type="button" data-entry-id={entry.id} onClick={handleOpen} className="block max-w-md text-left hover:underline">
                                        <span className="block truncate text-xs text-ink">{summary ?? t('openDetails')}</span>
                                        {reason ? <span className="block truncate text-xs text-ink-muted">{reason}</span> : null}
                                    </button>
                                </td>

                                {/* Event */}
                                <td className="px-5 py-3.5">
                                    {entry.eventId ? (
                                        <button
                                            type="button"
                                            data-entry-id={entry.id}
                                            onClick={handleEvent}
                                            title={t('filterByEvent')}
                                            className="font-mono text-xs text-ink-muted hover:text-ink hover:underline"
                                        >
                                            {entry.eventId.slice(0, 8)}
                                        </button>
                                    ) : (
                                        <span className="text-xs text-ink-faint">—</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
