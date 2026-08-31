'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCollaboratorEarnings, useCollaboratorEarningsTotals, useMarkCollaborationEarningsPaid } from '@/hooks/useAdmin';
import { balanceMinor, owedMinor, sortEarningsNewestFirst } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationEarningResponseDto, CollaboratorResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

const STATUS_PILL: Record<CollaborationEarningResponseDto['status'], string> = {
    ACCRUED: 'bg-status-warn-wash text-status-warn',
    PAID: 'bg-status-good-wash text-status-good',
    REVERSED: 'bg-status-neutral-wash text-status-neutral',
};

export function CollaborationEarningsPanel({ collaborator }: { collaborator: CollaboratorResponseDto | null }) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const earningsQuery = useCollaboratorEarnings(collaborator?.id ?? null);
    const totalsQuery = useCollaboratorEarningsTotals(collaborator?.id ?? null);
    const markPaid = useMarkCollaborationEarningsPaid(collaborator?.id ?? null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [payoutReference, setPayoutReference] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const earnings = useMemo(() => sortEarningsNewestFirst(earningsQuery.data ?? []), [earningsQuery.data]);
    const accruedIds = useMemo(() => earnings.filter((earning) => earning.status === 'ACCRUED').map((earning) => earning.id), [earnings]);
    const selectedAccrued = useMemo(() => earnings.filter((earning) => selectedIds.includes(earning.id)), [earnings, selectedIds]);
    const selectedTotal = selectedAccrued.reduce((sum, earning) => sum + earning.amountMinor, 0);
    const selectedCurrency = selectedAccrued[0]?.currency ?? null;
    const mixedCurrencies = selectedAccrued.some((earning) => earning.currency !== selectedCurrency);
    const canMarkPaid = selectedIds.length > 0 && payoutReference.trim().length > 0;

    const handleReferenceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setPayoutReference(event.target.value), []);
    const closeConfirm = useCallback(() => setConfirmOpen(false), []);
    const openConfirm = useCallback(() => {
        if (canMarkPaid) setConfirmOpen(true);
    }, [canMarkPaid]);

    const handleEarningToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const id = event.currentTarget.value;
        setSelectedIds((current) => (event.currentTarget.checked ? [...current, id] : current.filter((item) => item !== id)));
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedIds((current) => (current.length === accruedIds.length ? [] : accruedIds));
    }, [accruedIds]);

    const confirmMarkPaid = useCallback(async () => {
        await markPaid.mutateAsync({ earningIds: selectedIds, payoutReference: payoutReference.trim() });
        setSelectedIds([]);
        setPayoutReference('');
        setConfirmOpen(false);
    }, [markPaid, payoutReference, selectedIds]);

    if (!collaborator) return <p className="py-4 text-sm text-ink-muted">{t('selectPrompt')}</p>;

    return (
        <section className="space-y-5">
            {/* Totals */}
            <div>
                <h2 className="text-base font-semibold text-ink">{t('earnings.title')}</h2>
                {totalsQuery.isLoading && <LoadingState label={t('earnings.loadingTotals')} className="justify-start py-3" />}
                {totalsQuery.error && <p className="py-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(totalsQuery.error)}`)}</p>}
                {totalsQuery.data && totalsQuery.data.length === 0 && <p className="py-3 text-sm text-ink-muted">{t('earnings.emptyTotals')}</p>}
                {totalsQuery.data && totalsQuery.data.length > 0 && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {totalsQuery.data.map((total) => (
                            <div key={total.currency} className="rounded-lg bg-surface-muted/55 p-4">
                                <p className="font-mono text-xs font-bold text-ink-faint">{total.currency}</p>
                                <p className="mt-2 text-lg font-bold tabular-nums text-ink">{formatMoney(locale, owedMinor(total), total.currency)}</p>
                                <p className="mt-1 text-xs text-ink-muted">
                                    {t('earnings.paidBalance', {
                                        paid: formatMoney(locale, total.paidMinor, total.currency),
                                        balance: formatMoney(locale, balanceMinor(total), total.currency),
                                    })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Mark paid */}
            <div className="border-t border-border pt-5">
                <h3 className="text-sm font-bold text-ink">{t('earnings.markPaidTitle')}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <AdminField label={t('earnings.payoutReference')} required>
                        <input value={payoutReference} onChange={handleReferenceChange} maxLength={200} className={adminInputClass()} />
                    </AdminField>
                    <button
                        type="button"
                        onClick={openConfirm}
                        disabled={!canMarkPaid || markPaid.isPending}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"
                    >
                        {markPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {t('earnings.markPaid')}
                    </button>
                </div>
                {markPaid.error && <p className="mt-2 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(markPaid.error)}`)}</p>}
            </div>

            {/* Ledger */}
            <div className="border-t border-border pt-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-ink">{t('earnings.ledger')}</h3>
                    <button type="button" onClick={handleSelectAll} disabled={accruedIds.length === 0} className="text-xs font-semibold text-ink-muted disabled:opacity-40">
                        {selectedIds.length === accruedIds.length && accruedIds.length > 0 ? t('earnings.clear') : t('earnings.selectAccrued')}
                    </button>
                </div>
                {earningsQuery.isLoading && <LoadingState label={t('earnings.loading')} className="justify-start py-3" />}
                {earningsQuery.error && <p className="py-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(earningsQuery.error)}`)}</p>}
                {earnings.length === 0 && !earningsQuery.isLoading && !earningsQuery.error && <p className="py-3 text-sm text-ink-muted">{t('earnings.empty')}</p>}
                {earnings.length > 0 && (
                    <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-border">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                <tr>
                                    <th className="px-3 py-2">{t('earnings.columns.select')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.date')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.amount')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.basis')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.status')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.refs')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {earnings.map((earning) => (
                                    <tr key={earning.id}>
                                        <td className="px-3 py-2">
                                            <input
                                                type="checkbox"
                                                value={earning.id}
                                                checked={selectedIds.includes(earning.id)}
                                                onChange={handleEarningToggle}
                                                disabled={earning.status !== 'ACCRUED'}
                                                className="h-4 w-4 accent-primary disabled:opacity-30"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-ink-muted">{new Date(earning.accruedAt).toLocaleString()}</td>
                                        <td className="px-3 py-2 font-mono font-semibold text-ink">
                                            {formatMoney(locale, earning.amountMinor, earning.currency)}
                                        </td>
                                        <td className="px-3 py-2 text-ink-muted">
                                            {earning.commissionPercent}% {t('earnings.on')}{' '}
                                            {formatMoney(locale, earning.basisAmountMinor, earning.currency)}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-bold', STATUS_PILL[earning.status])}>
                                                {t(`earnings.status.${earning.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-[11px] text-ink-faint">
                                            <p>{earning.eventId}</p>
                                            <p>{earning.orderId}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmActionModal
                open={confirmOpen}
                onCloseAction={closeConfirm}
                title={t('earnings.confirmTitle')}
                body={
                    mixedCurrencies || !selectedCurrency
                        ? t('earnings.confirmBodyMixed', { count: selectedIds.length })
                        : t('earnings.confirmBody', {
                              count: selectedIds.length,
                              amount: formatMoney(locale, selectedTotal, selectedCurrency),
                              reference: payoutReference.trim(),
                          })
                }
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('earnings.markPaid')}
                isConfirming={markPaid.isPending}
                onConfirmAction={confirmMarkPaid}
                tone="default"
            />
        </section>
    );
}
