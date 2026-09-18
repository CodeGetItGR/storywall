'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { WithdrawalRow } from '@/components/admin/WithdrawalRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminWithdrawals } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function WithdrawalQueuePanel() {
    const t = useTranslations('AdminPage');
    const query = useAdminWithdrawals();

    const handleRefresh = useCallback(() => {
        query.refetch();
    }, [query]);

    const rows = query.data ?? [];

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight text-ink">{t('withdrawals.title')}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{t('withdrawals.subtitle')}</p>
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

            {query.isLoading && <LoadingState label={t('withdrawals.loading')} />}
            {query.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
            {!query.isLoading && !query.error && rows.length === 0 && <p className="py-3 text-sm text-ink-muted">{t('withdrawals.empty')}</p>}

            <div>
                {rows.map((row) => (
                    <WithdrawalRow key={row.request.id} row={row} />
                ))}
            </div>
        </section>
    );
}
