'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { RefundRow } from '@/components/admin/RefundRow';
import { useAdminRefundRequests } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { cn } from '@/lib/utils';

type QueueFilter = 'pending' | 'all';

export function RefundQueuePanel() {
    const t = useTranslations('AdminPage');
    const query = useAdminRefundRequests();
    const [filter, setFilter] = useState<QueueFilter>('pending');

    const handleRefresh = useCallback(() => {
        query.refetch();
    }, [query]);

    const handleShowPending = useCallback(() => setFilter('pending'), []);
    const handleShowAll = useCallback(() => setFilter('all'), []);

    const rows = useMemo(() => query.data ?? [], [query.data]);
    const pendingRows = useMemo(() => rows.filter((row) => row.request.status === 'PENDING'), [rows]);
    // Pending first regardless of filter: the queue exists to be emptied.
    const visibleRows = useMemo(
        () => (filter === 'pending' ? pendingRows : [...pendingRows, ...rows.filter((row) => row.request.status !== 'PENDING')]),
        [filter, pendingRows, rows]
    );

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight text-ink">{t('refunds.title')}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{t('refunds.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex overflow-hidden rounded-full ring-1 ring-border">
                        <button
                            type="button"
                            onClick={handleShowPending}
                            aria-pressed={filter === 'pending'}
                            className={cn(
                                'min-h-9 px-3 text-xs font-semibold transition',
                                filter === 'pending' ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-muted'
                            )}
                        >
                            {t('refunds.filterPending', { count: pendingRows.length })}
                        </button>
                        <button
                            type="button"
                            onClick={handleShowAll}
                            aria-pressed={filter === 'all'}
                            className={cn(
                                'min-h-9 px-3 text-xs font-semibold transition',
                                filter === 'all' ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-muted'
                            )}
                        >
                            {t('refunds.filterAll', { count: rows.length })}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={query.isFetching}
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-transparent px-3 text-xs font-semibold text-ink-muted ring-1 ring-border disabled:opacity-50"
                    >
                        <RefreshCw className={query.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                        {t('billingOps.refresh')}
                    </button>
                </div>
            </div>

            {query.isLoading && <p className="text-sm text-ink-muted">{t('refunds.loading')}</p>}
            {query.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
            {!query.isLoading && !query.error && visibleRows.length === 0 && (
                <p className="py-3 text-sm text-ink-muted">{filter === 'pending' ? t('refunds.emptyPending') : t('refunds.empty')}</p>
            )}

            <div>
                {visibleRows.map((row) => (
                    <RefundRow key={row.request.id} row={row} />
                ))}
            </div>
        </section>
    );
}
