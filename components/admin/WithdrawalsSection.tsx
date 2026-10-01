'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WithdrawalDetail } from '@/components/admin/WithdrawalDetail';
import { WithdrawalsTable } from '@/components/admin/WithdrawalsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useWithdrawalsPanel } from '@/hooks/useWithdrawalsPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function WithdrawalsSection() {
    const t = useTranslations('AdminPage');
    const panel = useWithdrawalsPanel();
    const ready = !panel.isLoading && !panel.error;

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header (list only; the detail page has its own) */}
            {!panel.selectedId && (
                <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{t('eyebrow')}</p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('withdrawals.title')}</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{t('withdrawals.subtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={panel.refresh}
                        disabled={panel.isFetching}
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-transparent px-3 text-xs font-semibold text-ink-muted ring-1 ring-border disabled:opacity-50"
                    >
                        <RefreshCw className={panel.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                        {t('billingOps.refresh')}
                    </button>
                </header>
            )}

            {panel.isLoading && <LoadingState label={t('withdrawals.loading')} className="justify-start py-6" />}
            {Boolean(panel.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(panel.error)}`)}</p>}

            {/* Content */}
            {ready && panel.selectedRow && (
                <WithdrawalDetail key={panel.selectedRow.request.id} row={panel.selectedRow} onReleasedAction={panel.backToList} />
            )}
            {ready && panel.selectedId && !panel.selectedRow && <p className="py-6 text-sm text-ink-muted">{t('errors.notFound')}</p>}
            {ready && !panel.selectedId && panel.rows.length === 0 && <p className="py-6 text-sm text-ink-muted">{t('withdrawals.empty')}</p>}
            {ready && !panel.selectedId && panel.rows.length > 0 && <WithdrawalsTable rows={panel.rows} />}
        </div>
    );
}
