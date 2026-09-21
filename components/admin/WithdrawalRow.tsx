'use client';

import { AlertTriangle, Check, Layers3, PackageMinus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { AdminEvidenceTile } from '@/components/admin/AdminEvidenceTile';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useReleaseWithdrawal, useWithholdWithdrawal } from '@/hooks/useAdmin';
import { adminErrorMessageKey, formatUsageFacts } from '@/lib/adminUtils';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

function formatDate(value: string | null, fallback: string): string {
    return value ? new Date(value).toLocaleString() : fallback;
}

export function WithdrawalRow({ row }: { row: WithdrawalAdminDto }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const { sendTo } = useAdminNavigation();
    const release = useReleaseWithdrawal();
    const withhold = useWithholdWithdrawal();
    const [note, setNote] = useState('');
    const [confirming, setConfirming] = useState<'release' | 'withhold' | null>(null);

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value), []);
    const askRelease = useCallback(() => setConfirming('release'), []);
    const askWithhold = useCallback(() => setConfirming('withhold'), []);
    const cancelConfirm = useCallback(() => setConfirming(null), []);

    const { request } = row;
    const usageFacts = formatUsageFacts(row.usageFacts);
    const held = request.status === 'HELD';
    const amount = formatOptionalMoney(request.totalRefundMinor, request.currency, locale);
    const isPending = release.isPending || withhold.isPending;
    const error = release.error ?? withhold.error;
    // Withholding is required to carry a note — it is the host's entire answer and
    // it also suspends their account, so an empty note is never acceptable.
    const withholdBlocked = !note.trim();

    const handleSendToAssignments = useCallback(() => sendTo('assignments', { eventId: request.eventId }), [request.eventId, sendTo]);
    const handleSendToPaidServices = useCallback(() => sendTo('paidServices', { eventId: request.eventId }), [request.eventId, sendTo]);

    const run = useCallback(
        async (decision: 'release' | 'withhold') => {
            if (decision === 'release') await release.mutateAsync(request.id);
            else await withhold.mutateAsync({ requestId: request.id, note: note.trim() });
            setConfirming(null);
        },
        [note, release, request.id, withhold]
    );

    const runConfirmed = useCallback(async () => {
        if (confirming) await run(confirming);
    }, [confirming, run]);

    return (
        <article className="border-b border-border py-5 last:border-b-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                held ? 'bg-status-warn-wash text-status-warn' : 'bg-surface-muted text-ink-muted'
                            )}
                        >
                            {t(`withdrawals.status.${request.status}`)}
                        </span>
                    </div>
                    {request.reason && <p className="mt-1 whitespace-pre-line text-xs text-ink-muted">{request.reason}</p>}
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink">{amount ?? t('withdrawals.noAmount')}</p>
                    <p className="text-[11px] text-ink-muted">
                        {t('withdrawals.requestedAt', { date: new Date(request.createdAt).toLocaleString() })}
                    </p>
                </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-ink">{row.recommendation}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
                {row.fraudSignals.map((signal) => (
                    <AdminEvidenceTile
                        key={signal.code}
                        label={`${signal.code}${signal.fired ? ` · ${t('withdrawals.signalFired')}` : ''}`}
                        value={signal.observed}
                        muted={!signal.fired}
                    />
                ))}
            </div>

            {/* Usage facts */}
            {usageFacts.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('withdrawals.usageFacts')}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {usageFacts.map(([key, value]) => (
                            <AdminEvidenceTile key={key} label={key} value={value} />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                <AdminIdentifier label={t('identifiers.eventId')} value={request.eventId} />
                <AdminIdentifier label={t('identifiers.requestId')} value={request.id} />
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-ink-muted">
                <button type="button" onClick={handleSendToAssignments} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                    <Layers3 className="h-3.5 w-3.5" />
                    {t('withdrawals.sendToAssignments')}
                </button>
                <button type="button" onClick={handleSendToPaidServices} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                    <PackageMinus className="h-3.5 w-3.5" />
                    {t('withdrawals.sendToPaidServices')}
                </button>
            </div>

            {!held && (
                <p className="mt-3 text-xs text-ink-muted">
                    {t(`withdrawals.status.${request.status}`)}
                    {request.decidedAt ? ` • ${formatDate(request.decidedAt, '')}` : ''}
                    {request.decisionNote ? ` — ${request.decisionNote}` : ''}
                </p>
            )}

            {held && (
                <div className="mt-3 border-t border-border pt-3">
                    <label className="text-xs font-semibold text-ink" htmlFor={`note-${request.id}`}>
                        {t('withdrawals.noteLabel')}{' '}
                        <span className="text-ink-faint">({withholdBlocked ? t('withdrawals.noteRequiredForWithhold') : tCommon('optional')})</span>
                    </label>
                    <p className="text-[11px] text-ink-muted">{t('withdrawals.noteHint')}</p>
                    <textarea
                        id={`note-${request.id}`}
                        value={note}
                        onChange={handleNoteChange}
                        rows={2}
                        maxLength={1000}
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink"
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={askRelease}
                            disabled={isPending}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            <Check className="h-4 w-4" />
                            {t('withdrawals.release')}
                        </button>
                        <button
                            type="button"
                            onClick={askWithhold}
                            disabled={isPending || withholdBlocked}
                            title={withholdBlocked ? t('withdrawals.noteRequiredHint') : undefined}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-border disabled:opacity-40"
                        >
                            <X className="h-4 w-4" />
                            {t('withdrawals.withhold')}
                        </button>
                        {withholdBlocked && <span className="text-[11px] text-ink-muted">{t('withdrawals.noteRequiredHint')}</span>}
                    </div>

                    {error && <p className="mt-2 text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            )}

            <ConfirmActionModal
                open={confirming !== null}
                onCloseAction={cancelConfirm}
                icon={confirming === 'withhold' ? <AlertTriangle className="h-5 w-5" /> : undefined}
                title={confirming === 'release' ? t('withdrawals.releaseConfirmTitle') : t('withdrawals.withholdConfirmTitle')}
                body={confirming === 'release' ? t('withdrawals.confirmRelease') : t('withdrawals.confirmWithhold')}
                cancelLabel={t('withdrawals.cancel')}
                confirmLabel={t('withdrawals.confirmYes')}
                isConfirming={isPending}
                onConfirmAction={runConfirmed}
                tone={confirming === 'withhold' ? 'danger' : 'default'}
            />
        </article>
    );
}
