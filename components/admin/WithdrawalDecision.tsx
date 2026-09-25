'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WithdrawalGuidanceBlock } from '@/components/admin/WithdrawalGuidanceBlock';
import { WithdrawalRefundModeControl } from '@/components/admin/WithdrawalRefundModeControl';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useWithdrawalDecision } from '@/hooks/useWithdrawalDecision';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { WithdrawalGuidanceSection } from '@/lib/adminWithdrawals';
import type { WithdrawalAdminDto } from '@/lib/api/types';

export function WithdrawalDecision({ row, guidance }: { row: WithdrawalAdminDto; guidance: WithdrawalGuidanceSection | null }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const decision = useWithdrawalDecision(row);
    const noteId = `note-${row.request.id}`;

    return (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
            {/* Guidance */}
            {guidance && <WithdrawalGuidanceBlock section={guidance} />}

            {/* Refund */}
            {decision.keepEventDayAvailability !== 'notApplicable' && (
                <WithdrawalRefundModeControl
                    value={decision.mode}
                    onChangeAction={decision.setMode}
                    keepEventDayAvailability={decision.keepEventDayAvailability}
                />
            )}

            {/* Note */}
            <div className="max-w-3xl">
                <label className="text-xs font-semibold text-ink" htmlFor={noteId}>
                    {t('withdrawals.noteLabel')}{' '}
                    <span className="text-ink-faint">({decision.noteRequired ? tCommon('required') : tCommon('optional')})</span>
                </label>
                <textarea
                    id={noteId}
                    value={decision.note}
                    onChange={decision.handleNoteChange}
                    rows={2}
                    maxLength={1000}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink"
                />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={decision.askRelease}
                    disabled={decision.isPending || decision.releaseBlocked}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                    <Check className="h-4 w-4" />
                    {t('withdrawals.release')}
                </button>
                {decision.releaseBlocked && <span className="text-[11px] text-ink-muted">{t('withdrawals.noteRequiredHint')}</span>}
            </div>

            {decision.error && <p className="text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(decision.error)}`)}</p>}

            <ConfirmActionModal
                open={decision.confirming}
                onCloseAction={decision.cancelRelease}
                title={t('withdrawals.releaseConfirmTitle')}
                body={t('withdrawals.confirmRelease', {
                    mode: decision.keepEventDay ? 'keep' : 'calculated',
                    scope: row.request.scope ?? 'EVENT',
                })}
                cancelLabel={t('withdrawals.cancel')}
                confirmLabel={t('withdrawals.release')}
                isConfirming={decision.isPending}
                onConfirmAction={decision.confirmRelease}
                tone="default"
            />
        </div>
    );
}
