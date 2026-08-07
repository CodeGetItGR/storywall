'use client';

import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { useAdminRefundRequests, useDecideRefundRequest } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { RefundRequestAdminDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';

function formatAmount(amountMinor: number | null, currency: string | null): string | null {
    if (amountMinor === null) return null;
    const value = amountMinor / 100;
    if (!currency) return value.toFixed(2);
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currency}`;
    }
}

// One evidence figure. Rendered plainly and always visible: the whole point of
// the queue is that an admin sees the counts *before* the approve button.
function Evidence({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-sm font-semibold tabular-nums text-ink">{value}</p>
            <p className="text-[11px] leading-tight text-ink-muted">{label}</p>
        </div>
    );
}

function RefundRow({ row }: { row: RefundRequestAdminDto }) {
    const t = useTranslations('AdminPage');
    const decide = useDecideRefundRequest();
    const [note, setNote] = useState('');
    const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value), []);
    const askApprove = useCallback(() => setConfirming('approve'), []);
    const askReject = useCallback(() => setConfirming('reject'), []);
    const cancelConfirm = useCallback(() => setConfirming(null), []);

    const { request } = row;
    const pending = request.status === 'PENDING';
    const amount = formatAmount(request.amountMinor, request.currency);

    const run = useCallback(
        (decision: 'approve' | 'reject') => {
            decide.mutate({ requestId: request.id, decision, note });
            setConfirming(null);
        },
        [decide, request.id, note]
    );

    const runConfirmed = useCallback(() => {
        if (confirming) run(confirming);
    }, [confirming, run]);

    return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{row.eventTitle}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                        {[row.hostDisplayName, row.hostEmail].filter(Boolean).join(' · ') || request.requestedById}
                    </p>
                </div>
                <div className="text-right">
                    {amount && <p className="text-sm font-semibold tabular-nums text-ink">{amount}</p>}
                    <p className="text-[11px] text-ink-muted">{new Date(request.requestedAt).toLocaleString()}</p>
                </div>
            </div>

            <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{request.reason}</p>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
                <Evidence label={t('refunds.guests')} value={String(row.guestCount)} />
                <Evidence label={t('refunds.posts')} value={String(row.postCount)} />
                <Evidence label={t('refunds.media')} value={String(row.mediaCount)} />
                <Evidence label={t('refunds.storage')} value={formatBytes(row.storageBytes)} />
            </div>

            {!row.currentlyEligible && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <p className="font-semibold">{t('refunds.notEligible')}</p>
                    {row.ineligibilityReasons.length > 0 && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {row.ineligibilityReasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {request.status === 'APPROVED' && !request.providerRefunded && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('refunds.notRefundedByProvider')}</span>
                </div>
            )}

            {!pending && (
                <p className="mt-3 text-xs text-ink-muted">
                    {t(`refunds.status.${request.status}`)}
                    {request.decidedAt ? ` · ${new Date(request.decidedAt).toLocaleString()}` : ''}
                    {request.decisionNote ? ` — ${request.decisionNote}` : ''}
                </p>
            )}

            {pending && (
                <div className="mt-3 border-t border-border pt-3">
                    <label className="text-xs font-semibold text-ink" htmlFor={`note-${request.id}`}>
                        {t('refunds.noteLabel')}
                    </label>
                    <p className="text-[11px] text-ink-muted">{t('refunds.noteHint')}</p>
                    <textarea
                        id={`note-${request.id}`}
                        value={note}
                        onChange={handleNoteChange}
                        rows={2}
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink"
                    />

                    {confirming ? (
                        <div className="mt-2 rounded-lg bg-surface-muted px-3 py-2">
                            <p className="text-xs text-ink">
                                {confirming === 'approve' ? t('refunds.confirmApprove') : t('refunds.confirmReject')}
                            </p>
                            <div className="mt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={runConfirmed}
                                    disabled={decide.isPending}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {decide.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t('refunds.confirmYes')}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelConfirm}
                                    className="inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold text-ink-muted"
                                >
                                    {t('refunds.cancel')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
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
                            {/* Rejection stays open even when the gates fail — that is the
                                outcome an ineligible request is supposed to reach. */}
                            <button
                                type="button"
                                onClick={askReject}
                                disabled={decide.isPending}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-border disabled:opacity-40"
                            >
                                <X className="h-4 w-4" />
                                {t('refunds.reject')}
                            </button>
                        </div>
                    )}

                    {decide.error && <p className="mt-2 text-xs text-rose-600">{t(`errors.${adminErrorMessageKey(decide.error)}`)}</p>}
                </div>
            )}
        </div>
    );
}

export function RefundQueuePanel() {
    const t = useTranslations('AdminPage');
    const query = useAdminRefundRequests();

    const handleRefresh = useCallback(() => {
        query.refetch();
    }, [query]);

    const rows = query.data ?? [];

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink">{t('refunds.title')}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{t('refunds.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={query.isFetching}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-border disabled:opacity-50"
                >
                    <RefreshCw className={query.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                    {t('billingOps.refresh')}
                </button>
            </div>

            {query.isLoading && <p className="text-sm text-ink-muted">{t('refunds.loading')}</p>}
            {query.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
            {!query.isLoading && !query.error && rows.length === 0 && (
                <p className="rounded-xl border border-border bg-card p-3 text-sm text-ink-muted">{t('refunds.empty')}</p>
            )}

            <div className="space-y-2">
                {rows.map((row) => (
                    <RefundRow key={row.request.id} row={row} />
                ))}
            </div>
        </section>
    );
}
