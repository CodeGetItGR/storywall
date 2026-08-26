'use client';

import { AlertTriangle, Check, Layers3, PackageMinus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { RefundEvidence } from '@/components/admin/RefundEvidence';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDecideRefundRequest } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { RefundRequestAdminDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

function formatDate(value: string | null, fallback: string): string {
    return value ? new Date(value).toLocaleString() : fallback;
}

export function RefundRow({ row }: { row: RefundRequestAdminDto }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const { sendTo } = useAdminNavigation();
    const decide = useDecideRefundRequest();
    const [note, setNote] = useState('');
    const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value), []);
    const askApprove = useCallback(() => setConfirming('approve'), []);
    const askReject = useCallback(() => setConfirming('reject'), []);
    const cancelConfirm = useCallback(() => setConfirming(null), []);

    const { request } = row;
    const pending = request.status === 'PENDING';
    const amount = formatOptionalMoney(request.amountMinor, request.currency, locale);
    // The server allows a null note on a rejection; the host is still owed an
    // answer, so the UI treats it as required (refunds guide §3).
    const rejectBlocked = !note.trim();

    const handleSendToAssignments = useCallback(
        () => sendTo('assignments', { eventId: request.eventId, eventTitle: row.eventTitle }),
        [request.eventId, row.eventTitle, sendTo]
    );
    const handleSendToPaidServices = useCallback(
        () => sendTo('paidServices', { eventId: request.eventId, eventTitle: row.eventTitle }),
        [request.eventId, row.eventTitle, sendTo]
    );

    const run = useCallback(
        async (decision: 'approve' | 'reject') => {
            await decide.mutateAsync({ requestId: request.id, decision, note });
            setConfirming(null);
        },
        [decide, request.id, note]
    );

    const runConfirmed = useCallback(async () => {
        if (confirming) await run(confirming);
    }, [confirming, run]);

    return (
        <article className="border-b border-border py-5 last:border-b-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-ink">{row.eventTitle}</h3>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                pending ? 'bg-status-warn-wash text-status-warn' : 'bg-surface-muted text-ink-muted'
                            )}
                        >
                            {t(`refunds.status.${request.status}`)}
                        </span>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{row.eventStatus}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-muted">
                        {row.hostDisplayName ?? request.requestedById}
                        {row.hostEmail && (
                            <>
                                {' · '}
                                <a className="font-semibold text-primary-dark underline underline-offset-2" href={`mailto:${row.hostEmail}`}>
                                    {row.hostEmail}
                                </a>
                            </>
                        )}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink">{amount ?? t('refunds.noAmount')}</p>
                    <p className="text-[11px] text-ink-muted">{t('refunds.requestedAt', { date: new Date(request.requestedAt).toLocaleString() })}</p>
                </div>
            </div>

            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{request.reason}</p>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4 lg:grid-cols-7">
                <RefundEvidence label={t('refunds.guests')} value={String(row.guestCount)} />
                <RefundEvidence label={t('refunds.hosts')} value={String(row.hostCount)} />
                <RefundEvidence label={t('refunds.posts')} value={String(row.postCount)} />
                <RefundEvidence label={t('refunds.media')} value={String(row.mediaCount)} />
                <RefundEvidence label={t('refunds.storage')} value={formatBytes(row.storageBytes)} />
                <RefundEvidence label={t('refunds.paidAt')} value={formatDate(row.paidAt, t('none'))} muted />
                <RefundEvidence label={t('refunds.eventWindow')} value={formatDate(row.eventStartAt, t('none'))} muted />
            </div>

            <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
                <AdminIdentifier label={t('identifiers.eventId')} value={request.eventId} />
                <AdminIdentifier label={t('identifiers.orderId')} value={request.orderId} />
                <AdminIdentifier label={t('identifiers.requestId')} value={request.id} />
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-ink-muted">
                <button type="button" onClick={handleSendToAssignments} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                    <Layers3 className="h-3.5 w-3.5" />
                    {t('refunds.sendToAssignments')}
                </button>
                <button type="button" onClick={handleSendToPaidServices} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                    <PackageMinus className="h-3.5 w-3.5" />
                    {t('refunds.sendToPaidServices')}
                </button>
            </div>

            {!row.currentlyEligible && (
                <div className="mt-3 border border-status-warn-wash bg-status-warn-wash px-3 py-2 text-xs text-status-warn">
                    <p className="font-semibold">{t('refunds.notEligible')}</p>
                    {row.ineligibilityReasons.length > 0 && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {row.ineligibilityReasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                            ))}
                        </ul>
                    )}
                    {pending && <p className="mt-1">{t('refunds.rejectStillAvailable')}</p>}
                </div>
            )}

            {request.status === 'APPROVED' && !request.providerRefunded && (
                <div className="mt-3 flex items-start gap-2 border border-status-danger-wash bg-status-danger-wash px-3 py-2 text-xs text-status-danger">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('refunds.notRefundedByProvider')}</span>
                </div>
            )}

            {!pending && (
                <p className="mt-3 text-xs text-ink-muted">
                    {t(`refunds.status.${request.status}`)}
                    {request.decidedAt ? ` • ${new Date(request.decidedAt).toLocaleString()}` : ''}
                    {request.decisionNote ? ` — ${request.decisionNote}` : ''}
                </p>
            )}

            {pending && (
                <div className="mt-3 border-t border-border pt-3">
                    <label className="text-xs font-semibold text-ink" htmlFor={`note-${request.id}`}>
                        {t('refunds.noteLabel')}{' '}
                        <span className="text-ink-faint">({rejectBlocked ? t('refunds.noteRequiredForReject') : tCommon('optional')})</span>
                    </label>
                    <p className="text-[11px] text-ink-muted">{t('refunds.noteHint')}</p>
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
                            onClick={askApprove}
                            disabled={decide.isPending || !row.currentlyEligible}
                            title={row.currentlyEligible ? undefined : t('refunds.notEligible')}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            <Check className="h-4 w-4" />
                            {t('refunds.approve')}
                        </button>
                        <button
                            type="button"
                            onClick={askReject}
                            disabled={decide.isPending || rejectBlocked}
                            title={rejectBlocked ? t('refunds.noteRequiredHint') : undefined}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-border disabled:opacity-40"
                        >
                            <X className="h-4 w-4" />
                            {t('refunds.reject')}
                        </button>
                        {rejectBlocked && <span className="text-[11px] text-ink-muted">{t('refunds.noteRequiredHint')}</span>}
                    </div>

                    {decide.error && <p className="mt-2 text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(decide.error)}`)}</p>}
                </div>
            )}

            <ConfirmActionModal
                open={confirming !== null}
                onCloseAction={cancelConfirm}
                title={
                    confirming === 'approve'
                        ? t('refunds.approveConfirmTitle', { event: row.eventTitle })
                        : t('refunds.rejectConfirmTitle', { event: row.eventTitle })
                }
                body={confirming === 'approve' ? t('refunds.confirmApprove') : t('refunds.confirmReject')}
                cancelLabel={t('refunds.cancel')}
                confirmLabel={t('refunds.confirmYes')}
                isConfirming={decide.isPending}
                onConfirmAction={runConfirmed}
                tone={confirming === 'approve' ? 'default' : 'danger'}
            />
        </article>
    );
}
