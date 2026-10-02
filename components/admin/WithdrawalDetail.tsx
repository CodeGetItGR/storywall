'use client';

import { ChevronDown, Layers3, PackageMinus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { WithdrawalDecision } from '@/components/admin/WithdrawalDecision';
import { WithdrawalFacts } from '@/components/admin/WithdrawalFacts';
import { WithdrawalGuidanceBlock } from '@/components/admin/WithdrawalGuidanceBlock';
import { WithdrawalSignals } from '@/components/admin/WithdrawalSignals';
import { BackButton } from '@/components/ui/BackButton';
import { useWithdrawalDetail } from '@/hooks/useWithdrawalDetail';
import { WITHDRAWALS_HASH_ROOT } from '@/lib/adminWithdrawalsRouting';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function WithdrawalDetail({
    row,
    onBackAction,
    onReleasedAction,
}: {
    row: WithdrawalAdminDto;
    onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onReleasedAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const { request } = row;
    const { held, amount, submittedAt, decidedAt, guidance, sendToAssignments, sendToPaidServices } = useWithdrawalDetail(row);

    return (
        <div className="max-w-4xl space-y-8">
            {/* Header */}
            <header className="space-y-3">
                <BackButton href={WITHDRAWALS_HASH_ROOT} label={t('withdrawals.title')} onClick={onBackAction} />
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-mono text-2xl font-extrabold tracking-tight text-ink tabular-nums sm:text-3xl">
                        {amount ?? t('withdrawals.noAmount')}
                    </h1>
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-bold',
                            held ? 'bg-status-warn-wash text-status-warn' : 'bg-surface-muted text-ink-muted',
                        )}
                    >
                        {t(`withdrawals.status.${request.status}`)}
                    </span>
                </div>
                <p className="text-sm text-ink-muted">
                    {t(`withdrawals.scope.${request.scope ?? 'EVENT'}`)} · {t('withdrawals.requestedAt', { date: submittedAt })}
                </p>
                {request.reason && <p className="text-sm whitespace-pre-line text-ink">{request.reason}</p>}
            </header>

            {/* Refund */}
            {guidance.refund && <WithdrawalGuidanceBlock section={guidance.refund} />}

            {/* Signals */}
            <WithdrawalSignals signals={row.fraudSignals} />

            {/* Usage facts */}
            <WithdrawalFacts usageFacts={row.usageFacts} />

            {/* Identifiers */}
            <section className="space-y-2">
                <div className="grid gap-3 sm:grid-cols-2">
                    <AdminIdentifier label={t('identifiers.eventId')} value={request.eventId} />
                    <AdminIdentifier label={t('identifiers.requestId')} value={request.id} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold text-ink-muted">
                    <button type="button" onClick={sendToAssignments} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                        <Layers3 className="h-3.5 w-3.5" />
                        {t('withdrawals.sendToAssignments')}
                    </button>
                    <button type="button" onClick={sendToPaidServices} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                        <PackageMinus className="h-3.5 w-3.5" />
                        {t('withdrawals.sendToPaidServices')}
                    </button>
                </div>
            </section>

            {/* Guidance */}
            {guidance.background.length > 0 && (
                <details className="group">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                        {t('withdrawals.guidanceToggle')}
                    </summary>
                    <div className="mt-4 space-y-5">
                        {guidance.background.map((section, index) => (
                            <WithdrawalGuidanceBlock key={index} section={section} />
                        ))}
                    </div>
                </details>
            )}

            {/* Outcome */}
            {!held && (
                <p className="text-xs text-ink-muted">
                    {t(`withdrawals.status.${request.status}`)}
                    {decidedAt ? ` • ${decidedAt}` : ''}
                    {request.decisionNote ? ` — ${request.decisionNote}` : ''}
                </p>
            )}

            {/* Decision */}
            {held && <WithdrawalDecision row={row} onReleasedAction={onReleasedAction} />}
        </div>
    );
}
