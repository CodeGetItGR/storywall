'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent, useState } from 'react';

import { AuditActionPill } from '@/components/admin/auditLog/AuditActionPill';
import { AuditLogDrawer } from '@/components/admin/auditLog/AuditLogDrawer';
import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuditSummaryText } from '@/hooks/useAuditSummaryText';
import { useEventHistory } from '@/hooks/useEventHistory';
import { auditAdminLabel, auditReason } from '@/lib/adminAuditLog';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

// What admins did to this event, newest first. A row opens the same drawer as the Audit log.
export function EventHistorySection({ eventId }: { eventId: string }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const summaryText = useAuditSummaryText();
    const history = useEventHistory(eventId);
    const [openId, setOpenId] = useState<string | null>(null);
    const data = history.query.data;
    const open = data?.content.find((entry) => entry.id === openId) ?? null;

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        setOpenId(event.currentTarget.dataset.entryId ?? null);
    }

    function close() {
        setOpenId(null);
    }

    return (
        <OrderCard title={t('events.history.title')}>
            {/* Loading, error and empty */}
            {history.query.isLoading ? <p className="text-sm text-ink-muted">{t('auditLog.loading')}</p> : null}
            {history.query.error ? <p className="text-sm text-status-danger">{toErrorMessage(history.query.error)}</p> : null}
            {data && data.content.length === 0 ? <p className="text-sm text-ink-muted">{t('events.history.empty')}</p> : null}

            {/* Entries */}
            {data && data.content.length > 0 ? (
                <>
                    <ul className="-mx-2 divide-y divide-border">
                        {data.content.map((entry) => {
                            const summary = summaryText(entry);
                            const reason = auditReason(entry.details);
                            return (
                                <li key={entry.id}>
                                    <button
                                        type="button"
                                        data-entry-id={entry.id}
                                        onClick={handleOpen}
                                        className="flex w-full flex-col gap-1 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-canvas"
                                    >
                                        <span className="flex flex-wrap items-center gap-2">
                                            <AuditActionPill action={entry.action} />
                                            <span className="font-mono text-[11px] text-ink-faint">{formatDate(locale, entry.createdAt, DATE_FORMAT)}</span>
                                            <span className="text-xs font-semibold text-ink-muted">{auditAdminLabel(entry)}</span>
                                        </span>
                                        {summary ? <span className="text-xs text-ink">{summary}</span> : null}
                                        {reason ? <span className="truncate text-xs text-ink-muted">{reason}</span> : null}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {data.page.totalPages > 1 ? (
                        <div className="-mx-5 mt-3 -mb-5">
                            <AdminPagination
                                pageInfo={data.page}
                                page={history.page}
                                summary={t('auditLog.count', { count: data.page.totalElements })}
                                onPageChangeAction={history.setPage}
                            />
                        </div>
                    ) : null}
                </>
            ) : null}

            {/* Entry */}
            {open ? <AuditLogDrawer key={open.id} entry={open} onCloseAction={close} /> : null}
        </OrderCard>
    );
}
