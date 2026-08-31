'use client';

import { CheckCircle2, Eye, Loader2, Unlink2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCollaboratorEarnings, useCollaboratorEarningsTotals, useMarkCollaborationEarningsPaid, useVoidCollaborationRedemption } from '@/hooks/useAdmin';
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
type EarningStatusFilter = 'OPEN' | 'ALL' | CollaborationEarningResponseDto['status'];

export function CollaborationEarningsPanel({ collaborator }: { collaborator: CollaboratorResponseDto | null }) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const earningsQuery = useCollaboratorEarnings(collaborator?.id ?? null);
    const totalsQuery = useCollaboratorEarningsTotals(collaborator?.id ?? null);
    const markPaid = useMarkCollaborationEarningsPaid(collaborator?.id ?? null);
    const voidRedemption = useVoidCollaborationRedemption();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [payoutReference, setPayoutReference] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<EarningStatusFilter>('OPEN');
    const [detailId, setDetailId] = useState<string | null>(null);
    const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState('');

    const earnings = useMemo(() => sortEarningsNewestFirst(earningsQuery.data ?? []), [earningsQuery.data]);
    const filteredEarnings = useMemo(
        () =>
            earnings.filter((earning) => {
                if (statusFilter === 'OPEN') return earning.status !== 'REVERSED';
                if (statusFilter === 'ALL') return true;
                return earning.status === statusFilter;
            }),
        [earnings, statusFilter]
    );
    const accruedIds = useMemo(() => filteredEarnings.filter((earning) => earning.status === 'ACCRUED').map((earning) => earning.id), [filteredEarnings]);
    const selectedAccrued = useMemo(() => earnings.filter((earning) => selectedIds.includes(earning.id)), [earnings, selectedIds]);
    const detailEarning = earnings.find((earning) => earning.id === detailId) ?? null;
    const voidTarget = earnings.find((earning) => earning.id === voidTargetId) ?? null;
    const selectedTotal = selectedAccrued.reduce((sum, earning) => sum + earning.amountMinor, 0);
    const selectedCurrency = selectedAccrued[0]?.currency ?? null;
    const mixedCurrencies = selectedAccrued.some((earning) => earning.currency !== selectedCurrency);
    const canMarkPaid = selectedIds.length > 0 && payoutReference.trim().length > 0;
    const canVoid = Boolean(voidTarget && voidTarget.status !== 'REVERSED' && voidReason.trim());

    const handleReferenceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setPayoutReference(event.target.value), []);
    const handleVoidReasonChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => setVoidReason(event.target.value), []);
    const handleStatusFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(event.target.value as EarningStatusFilter), []);
    const closeConfirm = useCallback(() => setConfirmOpen(false), []);
    const closeDetail = useCallback(() => setDetailId(null), []);
    const closeVoidConfirm = useCallback(() => {
        setVoidTargetId(null);
        setVoidReason('');
    }, []);
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

    const handleOpenDetail = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setDetailId(event.currentTarget.dataset.earningId ?? null);
    }, []);

    const handleOpenVoid = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setVoidTargetId(event.currentTarget.dataset.earningId ?? null);
    }, []);

    const confirmMarkPaid = useCallback(async () => {
        await markPaid.mutateAsync({ earningIds: selectedIds, payoutReference: payoutReference.trim() });
        setSelectedIds([]);
        setPayoutReference('');
        setConfirmOpen(false);
    }, [markPaid, payoutReference, selectedIds]);

    const confirmVoid = useCallback(async () => {
        if (!canVoid || !voidTarget) return;
        await voidRedemption.mutateAsync({ eventId: voidTarget.eventId, input: { reason: voidReason.trim() } });
        await Promise.all([earningsQuery.refetch(), totalsQuery.refetch()]);
        setSelectedIds((current) => current.filter((id) => id !== voidTarget.id));
        setVoidTargetId(null);
        setVoidReason('');
    }, [canVoid, earningsQuery, totalsQuery, voidReason, voidRedemption, voidTarget]);

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
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={statusFilter} onChange={handleStatusFilterChange} className={adminInputClass('h-9 w-auto py-0 text-xs')}>
                            <option value="OPEN">{t('earnings.filters.open')}</option>
                            <option value="ACCRUED">{t('earnings.status.ACCRUED')}</option>
                            <option value="PAID">{t('earnings.status.PAID')}</option>
                            <option value="REVERSED">{t('earnings.status.REVERSED')}</option>
                            <option value="ALL">{t('earnings.filters.all')}</option>
                        </select>
                        <button type="button" onClick={handleSelectAll} disabled={accruedIds.length === 0} className="text-xs font-semibold text-ink-muted disabled:opacity-40">
                            {selectedIds.length === accruedIds.length && accruedIds.length > 0 ? t('earnings.clear') : t('earnings.selectAccrued')}
                        </button>
                    </div>
                </div>
                {earningsQuery.isLoading && <LoadingState label={t('earnings.loading')} className="justify-start py-3" />}
                {earningsQuery.error && <p className="py-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(earningsQuery.error)}`)}</p>}
                {filteredEarnings.length === 0 && !earningsQuery.isLoading && !earningsQuery.error && <p className="py-3 text-sm text-ink-muted">{t('earnings.empty')}</p>}
                {filteredEarnings.length > 0 && (
                    <div>
                        {/* Mobile Ledger */}
                        <div className="divide-y divide-border rounded-lg bg-card ring-1 ring-border md:hidden">
                            {filteredEarnings.map((earning) => (
                                <div key={earning.id} className="space-y-3 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-mono text-sm font-semibold text-ink">{formatMoney(locale, earning.amountMinor, earning.currency)}</p>
                                            <p className="mt-1 text-xs text-ink-muted">{new Date(earning.accruedAt).toLocaleString()}</p>
                                        </div>
                                        <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-bold', STATUS_PILL[earning.status])}>
                                            {t(`earnings.status.${earning.status}`)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <p className="font-semibold text-ink-faint">{t('earnings.columns.basis')}</p>
                                            <p className="mt-0.5 text-ink-muted">
                                                {earning.commissionPercent}% {t('earnings.on')} {formatMoney(locale, earning.basisAmountMinor, earning.currency)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-ink-faint">{t('earnings.columns.reference')}</p>
                                            <p className="mt-0.5 font-mono text-ink-muted">{earning.payoutReference ?? t('earnings.noReference')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted">
                                            <input
                                                type="checkbox"
                                                value={earning.id}
                                                checked={selectedIds.includes(earning.id)}
                                                onChange={handleEarningToggle}
                                                disabled={earning.status !== 'ACCRUED'}
                                                className="h-4 w-4 accent-primary disabled:opacity-30"
                                            />
                                            {t('earnings.columns.select')}
                                        </label>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                data-earning-id={earning.id}
                                                onClick={handleOpenDetail}
                                                className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-surface-muted px-2.5 text-xs font-semibold text-ink-muted"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                {t('earnings.details')}
                                            </button>
                                            <button
                                                type="button"
                                                data-earning-id={earning.id}
                                                onClick={handleOpenVoid}
                                                disabled={earning.status === 'REVERSED'}
                                                className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-rose-50 px-2.5 text-xs font-semibold text-status-danger disabled:opacity-30"
                                            >
                                                <Unlink2 className="h-3.5 w-3.5" />
                                                {t('void.action')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Ledger */}
                        <div className="hidden overflow-x-auto rounded-lg bg-card ring-1 ring-border md:block">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                <tr>
                                    <th className="px-3 py-2">{t('earnings.columns.select')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.date')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.amount')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.basis')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.status')}</th>
                                    <th className="px-3 py-2">{t('earnings.columns.reference')}</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredEarnings.map((earning) => (
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
                                            {earning.payoutReference ?? t('earnings.noReference')}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    data-earning-id={earning.id}
                                                    onClick={handleOpenDetail}
                                                    aria-label={t('earnings.details')}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    data-earning-id={earning.id}
                                                    onClick={handleOpenVoid}
                                                    disabled={earning.status === 'REVERSED'}
                                                    aria-label={t('void.action')}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-status-danger hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    <Unlink2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
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
            <AdminDrawer
                open={Boolean(detailEarning)}
                onClose={closeDetail}
                title={detailEarning ? t('earnings.detailTitle') : t('earnings.ledger')}
                subtitle={detailEarning ? new Date(detailEarning.accruedAt).toLocaleString() : undefined}
                closeLabel={tAdmin('cancel')}
                footer={
                    detailEarning ? (
                        <button
                            type="button"
                            data-earning-id={detailEarning.id}
                            onClick={handleOpenVoid}
                            disabled={detailEarning.status === 'REVERSED'}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-status-danger px-3 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            <Unlink2 className="h-4 w-4" />
                            {t('void.action')}
                        </button>
                    ) : null
                }
            >
                {detailEarning && (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="rounded-lg bg-surface-muted/55 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{t('earnings.amount')}</p>
                            <p className="mt-1 font-mono text-xl font-bold text-ink">{formatMoney(locale, detailEarning.amountMinor, detailEarning.currency)}</p>
                        </div>

                        {/* Details */}
                        <dl className="grid gap-3 text-sm">
                            <div>
                                <dt className="text-xs font-semibold text-ink-faint">{t('earnings.columns.status')}</dt>
                                <dd className="mt-1">
                                    <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-bold', STATUS_PILL[detailEarning.status])}>
                                        {t(`earnings.status.${detailEarning.status}`)}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-ink-faint">{t('earnings.columns.basis')}</dt>
                                <dd className="mt-1 text-ink">
                                    {detailEarning.commissionPercent}% {t('earnings.on')} {formatMoney(locale, detailEarning.basisAmountMinor, detailEarning.currency)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-ink-faint">{t('earnings.entryType')}</dt>
                                <dd className="mt-1 text-ink">{t(`earnings.entryTypes.${detailEarning.entryType}`)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-ink-faint">{t('earnings.columns.reference')}</dt>
                                <dd className="mt-1 font-mono text-xs text-ink">{detailEarning.payoutReference ?? t('earnings.noReference')}</dd>
                            </div>
                            {detailEarning.paidAt && (
                                <div>
                                    <dt className="text-xs font-semibold text-ink-faint">{t('earnings.paidAt')}</dt>
                                    <dd className="mt-1 text-ink">{new Date(detailEarning.paidAt).toLocaleString()}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                )}
            </AdminDrawer>
            <ConfirmActionModal
                open={Boolean(voidTarget)}
                onCloseAction={closeVoidConfirm}
                title={t('void.confirmTitle')}
                body={
                    <div className="space-y-3">
                        <p>{t('void.confirmBody')}</p>
                        <AdminField label={t('void.reason')} required>
                            <textarea value={voidReason} onChange={handleVoidReasonChange} maxLength={500} className={adminInputClass('min-h-24 resize-y')} />
                        </AdminField>
                        {voidRedemption.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(voidRedemption.error)}`)}</p>}
                    </div>
                }
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('void.action')}
                isConfirming={voidRedemption.isPending}
                onConfirmAction={confirmVoid}
            />
        </section>
    );
}
