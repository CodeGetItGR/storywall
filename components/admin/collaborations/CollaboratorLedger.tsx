'use client';

import { useTranslations } from 'next-intl';

import { CollaboratorLedgerRow } from '@/components/admin/collaborations/CollaboratorLedgerRow';
import { LedgerSelectionBar } from '@/components/admin/collaborations/LedgerSelectionBar';
import { MarkPaidModal } from '@/components/admin/collaborations/MarkPaidModal';
import { VoidEarningModal } from '@/components/admin/collaborations/VoidEarningModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCollaboratorLedger } from '@/hooks/useCollaboratorLedger';
import { EARNING_FILTERS } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function CollaboratorLedger({ collaboratorId, codes }: { collaboratorId: string; codes: CollaborationCodeResponseDto[] }) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const tAdmin = useTranslations('AdminPage');
    const ledger = useCollaboratorLedger(collaboratorId);

    return (
        <div className="rounded-xl border border-border bg-card">
            {/* Filter */}
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                    {EARNING_FILTERS.map((filter) => (
                        <button
                            key={filter}
                            type="button"
                            data-filter={filter}
                            onClick={ledger.handleFilterClick}
                            aria-pressed={ledger.filter === filter}
                            className={cn(
                                'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                ledger.filter === filter ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                            )}
                        >
                            {t(`filters.${filter}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rows */}
            {ledger.isLoading && <LoadingState label={t('loading')} className="justify-start px-4 py-6" />}
            {Boolean(ledger.error) && <p className="px-4 py-6 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(ledger.error)}`)}</p>}
            {!ledger.isLoading && !ledger.error && ledger.visibleEarnings.length === 0 && (
                <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>
            )}
            {ledger.visibleEarnings.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] border-collapse text-[13px]">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="w-10 px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={ledger.allSelected}
                                        onChange={ledger.handleToggleAll}
                                        disabled={ledger.selectableCount === 0}
                                        aria-label={t('selectAll')}
                                        className="h-4 w-4 accent-primary disabled:opacity-30"
                                    />
                                </th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.date')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.event')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.code')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.commission')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.amount')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.status')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.reference')}</th>
                                <th className="px-2.5 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.visibleEarnings.map((earning) => (
                                <CollaboratorLedgerRow
                                    key={earning.id}
                                    earning={earning}
                                    codes={codes}
                                    selected={ledger.selectedIds.includes(earning.id)}
                                    voidable={ledger.voidableIds.has(earning.id)}
                                    onToggleAction={ledger.handleToggle}
                                    onVoidAction={ledger.handleVoidClick}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Selection */}
            {ledger.selectedIds.length > 0 && (
                <LedgerSelectionBar
                    count={ledger.selectedIds.length}
                    totals={ledger.selectionTotals}
                    onClearAction={ledger.clearSelection}
                    onMarkPaidAction={ledger.openMarkPaid}
                />
            )}

            <MarkPaidModal
                open={ledger.markPaidOpen}
                count={ledger.selectedIds.length}
                totals={ledger.selectionTotals}
                reference={ledger.reference}
                canConfirm={ledger.canMarkPaid}
                isConfirming={ledger.markPaidPending}
                error={ledger.markPaidError}
                onReferenceChangeAction={ledger.handleReferenceChange}
                onCloseAction={ledger.closeMarkPaid}
                onConfirmAction={ledger.confirmMarkPaid}
            />
            <VoidEarningModal
                open={ledger.voidOpen}
                reason={ledger.voidReason}
                canConfirm={ledger.canVoid}
                isConfirming={ledger.voidPending}
                error={ledger.voidError}
                onReasonChangeAction={ledger.handleVoidReasonChange}
                onCloseAction={ledger.closeVoid}
                onConfirmAction={ledger.confirmVoid}
            />
        </div>
    );
}
