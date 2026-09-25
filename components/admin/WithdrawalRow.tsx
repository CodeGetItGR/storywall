'use client';

import { Layers3, PackageMinus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { WithdrawalDecision } from '@/components/admin/WithdrawalDecision';
import { WithdrawalFacts } from '@/components/admin/WithdrawalFacts';
import { WithdrawalGuidanceBlock } from '@/components/admin/WithdrawalGuidanceBlock';
import { WithdrawalSignals } from '@/components/admin/WithdrawalSignals';
import { useWithdrawalRow } from '@/hooks/useWithdrawalRow';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function WithdrawalRow({ row }: { row: WithdrawalAdminDto }) {
    const t = useTranslations('AdminPage');
    const { request } = row;
    const { held, amount, submittedAt, decidedAt, guidance, sendToAssignments, sendToPaidServices } = useWithdrawalRow(row);

    return (
        <article className="border-b border-border py-5 last:border-b-0">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-bold',
                            held ? 'bg-status-warn-wash text-status-warn' : 'bg-surface-muted text-ink-muted',
                        )}
                    >
                        {t(`withdrawals.status.${request.status}`)}
                    </span>
                    {request.reason && <p className="mt-1 text-xs whitespace-pre-line text-ink-muted">{request.reason}</p>}
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-ink tabular-nums">{amount ?? t('withdrawals.noAmount')}</p>
                    <p className="text-[11px] text-ink-muted">{t('withdrawals.requestedAt', { date: submittedAt })}</p>
                </div>
            </div>

            <div className="mt-4 space-y-5">
                {/* Guidance */}
                {guidance.sections.map((section, index) => (
                    <WithdrawalGuidanceBlock key={index} section={section} />
                ))}

                {/* Signals */}
                <WithdrawalSignals signals={row.fraudSignals} />

                {/* Usage facts */}
                <WithdrawalFacts usageFacts={row.usageFacts} />

                {/* Identifiers */}
                <div className="space-y-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <AdminIdentifier label={t('identifiers.eventId')} value={request.eventId} />
                        <AdminIdentifier label={t('identifiers.requestId')} value={request.id} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-semibold text-ink-muted">
                        <button type="button" onClick={sendToAssignments} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                            <Layers3 className="h-3.5 w-3.5" />
                            {t('withdrawals.sendToAssignments')}
                        </button>
                        <button
                            type="button"
                            onClick={sendToPaidServices}
                            className="inline-flex items-center gap-1.5 hover:text-ink hover:underline"
                        >
                            <PackageMinus className="h-3.5 w-3.5" />
                            {t('withdrawals.sendToPaidServices')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Outcome */}
            {!held && (
                <p className="mt-4 text-xs text-ink-muted">
                    {t(`withdrawals.status.${request.status}`)}
                    {decidedAt ? ` • ${decidedAt}` : ''}
                    {request.decisionNote ? ` — ${request.decisionNote}` : ''}
                </p>
            )}

            {/* Decision */}
            {held && <WithdrawalDecision row={row} guidance={guidance.decision} />}
        </article>
    );
}
